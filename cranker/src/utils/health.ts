import { prisma } from "../db/client";

export type ErrorType = "INVALID_MINT" | "PLATFORM_PAUSED" | "RPC_RATE_LIMIT" | "RPC_ERROR" | "TX_ERROR" | "UNKNOWN";

/**
 * Vault-specific errors: the vault itself is broken.
 * These count against the vault and can trigger auto-pause.
 */
const VAULT_ERRORS = new Set<ErrorType>(["INVALID_MINT", "TX_ERROR"]);

/** Permanent vault errors — auto-pause immediately, no retries */
const PERMANENT_ERRORS = new Set<ErrorType>(["INVALID_MINT"]);

/** Max vault-specific failures before auto-pause */
const MAX_VAULT_FAILURES = 10;

/**
 * Infrastructure errors: not the vault's fault.
 * Tracked for admin visibility but never count against vaults.
 *
 * PLATFORM_PAUSED — on-chain pause, affects all vaults
 * RPC_RATE_LIMIT  — Helius/RPC rate limiting
 * RPC_ERROR       — network timeouts, connection refused
 * UNKNOWN         — unclassified (safe default: don't penalize)
 */

/**
 * Classify an error into a category for health tracking.
 */
export function classifyError(err: any): ErrorType {
  const msg = err?.message ?? String(err);
  const code = err?.code;

  // Invalid mint — permanent, vault-specific
  if (code === -32602 && msg.includes("not a Token mint")) {
    return "INVALID_MINT";
  }

  // Platform paused on-chain — infrastructure
  if (msg.includes("PlatformPaused") || err?.error?.errorCode?.code === "PlatformPaused") {
    return "PLATFORM_PAUSED";
  }

  // Rate limiting — infrastructure
  if (code === 429 || msg.includes("429") || msg.includes("Too Many Requests")) {
    return "RPC_RATE_LIMIT";
  }

  // Timeouts — infrastructure
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
    return "RPC_ERROR";
  }

  // Transaction errors — vault-specific (simulation failed = bad account state)
  // BlockhashNotFound is infra, but usually retried by Solana client internally
  if (msg.includes("Transaction simulation failed") || msg.includes("BlockhashNotFound")) {
    return "TX_ERROR";
  }

  return "UNKNOWN";
}

/** Result from a per-vault service step */
export interface StepResult {
  vaultId: number;
  mint: string;
  success: boolean;
  error?: any;
}

/**
 * Process health results from a cycle batch.
 *
 * Core principle: only vault-specific errors count against vault health.
 * Infrastructure errors (RPC down, platform paused, rate limits) are
 * tracked for visibility but never increment failures or trigger auto-pause.
 *
 * - Vault error    → increment consecutiveFailures, may auto-pause
 * - Infra error    → log only, don't touch vault state
 * - All succeeded  → reset consecutiveFailures
 */
export async function updateHealthFromResults(
  allResults: StepResult[][]
): Promise<void> {
  // Classify each vault's worst error
  const vaultFailures = new Map<number, { mint: string; errorType: ErrorType; error: any }>();
  const infraOnly = new Map<number, { mint: string; errorType: ErrorType }>();
  const allVaultIds = new Set<number>();

  for (const results of allResults) {
    for (const r of results) {
      allVaultIds.add(r.vaultId);
      if (!r.success) {
        const errorType = classifyError(r.error);

        if (VAULT_ERRORS.has(errorType)) {
          // Vault-specific error takes priority
          if (!vaultFailures.has(r.vaultId)) {
            vaultFailures.set(r.vaultId, { mint: r.mint, errorType, error: r.error });
          }
        } else if (!vaultFailures.has(r.vaultId) && !infraOnly.has(r.vaultId)) {
          // Track infra error only if no vault error already recorded
          infraOnly.set(r.vaultId, { mint: r.mint, errorType });
        }
      }
    }
  }

  // Vaults that had zero failures of any kind
  const cleanIds = [...allVaultIds].filter(
    (id) => !vaultFailures.has(id) && !infraOnly.has(id)
  );

  // Vaults that only had infra errors — also count as "healthy" for reset purposes
  // since the vault itself didn't fail
  const infraOnlyIds = [...infraOnly.keys()].filter((id) => !vaultFailures.has(id));
  const resetIds = [...cleanIds, ...infraOnlyIds];

  // Reset healthy vaults (clean runs + infra-only runs both count as healthy)
  if (resetIds.length > 0) {
    await prisma.vault.updateMany({
      where: { id: { in: resetIds }, consecutiveFailures: { gt: 0 } },
      data: { consecutiveFailures: 0, lastErrorType: null },
    });
  }

  // Log infra errors for observability but don't touch vault state
  for (const [, { mint, errorType }] of infraOnly) {
    console.log(`[health] ${mint}: infra error (${errorType}), not counting against vault`);
  }

  // Process vault-specific failures
  for (const [vaultId, { mint, errorType }] of vaultFailures) {
    const vault = await prisma.vault.update({
      where: { id: vaultId },
      data: {
        consecutiveFailures: { increment: 1 },
        lastErrorType: errorType,
      },
    });

    const shouldPause =
      PERMANENT_ERRORS.has(errorType) ||
      vault.consecutiveFailures >= MAX_VAULT_FAILURES;

    if (shouldPause) {
      const reason = PERMANENT_ERRORS.has(errorType)
        ? `Permanent error: ${errorType}`
        : `Auto-paused after ${vault.consecutiveFailures} consecutive ${errorType} failures`;

      await prisma.vault.update({
        where: { id: vaultId },
        data: {
          active: false,
          pausedAt: new Date(),
          pauseReason: reason,
        },
      });

      console.warn(`[health] Vault ${mint} auto-paused: ${reason}`);
    }
  }
}
