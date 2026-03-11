import { DEFAULT_CLAIM_EXPIRY_HOURS, VAULT_CONCURRENCY } from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";
import { getOnChainClaimed } from "../utils/onchain";

/**
 * Expire stale allocations from wallets that sold all tokens and haven't claimed.
 * Runs per-vault, marks expired wallets in ExpiredAllocation table,
 * and increments vault.expiredUnclaimedTotal for the merkle builder to reclaim.
 */
export async function expireStaleAllocations(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await expireForVault(vault);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[expiry] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function expireForVault(vault: Vault): Promise<void> {
  const expiryHours = vault.claimExpiryHours ?? DEFAULT_CLAIM_EXPIRY_HOURS;
  const cutoff = new Date(Date.now() - expiryHours * 3600_000);
  const mintStr = vault.tokenMint;

  // Find wallets that have had zero balance long enough
  const candidates = await prisma.holderBalance.findMany({
    where: {
      vaultId: vault.id,
      balance: 0n,
      balanceZeroSince: { not: null, lt: cutoff },
    },
    select: { wallet: true },
  });

  if (candidates.length === 0) return;

  // Get latest distribution for this vault
  const latestDist = await prisma.distributionRecord.findFirst({
    where: { vaultId: vault.id },
    orderBy: { epochNumber: "desc" },
    select: { id: true },
  });

  if (!latestDist) return; // No distributions yet, nothing to expire

  // Get allocations for candidate wallets from the latest distribution
  const allocations = await prisma.allocationRecord.findMany({
    where: {
      distributionId: latestDist.id,
      wallet: { in: candidates.map((c) => c.wallet) },
    },
    select: { wallet: true, cumulativeAmount: true },
  });

  if (allocations.length === 0) return;

  let expiredCount = 0;
  let totalReclaimed = 0n;

  for (const alloc of allocations) {
    // Check if already expired with same amount
    const existing = await prisma.expiredAllocation.findUnique({
      where: { vaultId_wallet: { vaultId: vault.id, wallet: alloc.wallet } },
    });

    if (existing && existing.cumulativeAmount === alloc.cumulativeAmount) {
      continue; // Already expired at this amount, skip
    }

    // Read claimed/received amount — mode-aware
    let claimedAmount: bigint;
    if (vault.distributionMode === "push") {
      const holder = await prisma.holderBalance.findUnique({
        where: { vaultId_wallet: { vaultId: vault.id, wallet: alloc.wallet } },
      });
      claimedAmount = holder?.totalReceived ?? 0n;
    } else {
      claimedAmount = await getOnChainClaimed(mintStr, alloc.wallet);
    }
    const expiredAmount = alloc.cumulativeAmount - claimedAmount;

    if (expiredAmount <= 0n) continue; // Fully claimed, nothing to expire

    // Calculate delta for expiredUnclaimedTotal
    const previousExpiredAmount = existing?.expiredAmount ?? 0n;
    const delta = expiredAmount - previousExpiredAmount;

    if (delta <= 0n) continue; // No change or decrease (shouldn't happen)

    // Upsert ExpiredAllocation and increment vault total in a single transaction
    await prisma.$transaction([
      prisma.expiredAllocation.upsert({
        where: { vaultId_wallet: { vaultId: vault.id, wallet: alloc.wallet } },
        create: {
          vaultId: vault.id,
          wallet: alloc.wallet,
          cumulativeAmount: alloc.cumulativeAmount,
          claimedAmount,
          expiredAmount,
        },
        update: {
          cumulativeAmount: alloc.cumulativeAmount,
          claimedAmount,
          expiredAmount,
          expiredAt: new Date(),
        },
      }),
      prisma.vault.update({
        where: { id: vault.id },
        data: { expiredUnclaimedTotal: { increment: delta } },
      }),
    ]);

    expiredCount++;
    totalReclaimed += delta;
  }

  if (expiredCount > 0) {
    console.log(
      `[expiry] ${vault.symbol || mintStr}: expired ${expiredCount} wallets, reclaimed ${totalReclaimed} lamports`
    );
  }
}
