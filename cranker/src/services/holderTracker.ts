import { PublicKey } from "@solana/web3.js";
import { connection, TOP_HOLDERS, VAULT_CONCURRENCY } from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";
import { fetchTopHolders } from "../utils/heliusDas";

/**
 * Fetch top token holders for a batch of vaults and upsert to DB.
 * Returns per-vault success/failure results for health tracking.
 */
export async function trackHolders(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await trackHoldersForVault(vault);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[holders] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

export async function trackHoldersForVault(vault: Vault): Promise<void>;
export async function trackHoldersForVault(vaultId: number, mintStr: string): Promise<void>;
export async function trackHoldersForVault(
  vaultOrId: Vault | number,
  mintStr?: string
): Promise<void> {
  let vault: Vault;
  if (typeof vaultOrId === "number") {
    const found = await prisma.vault.findUnique({ where: { id: vaultOrId } });
    if (!found) throw new Error(`Vault not found: ${vaultOrId}`);
    vault = found;
    if (!mintStr) mintStr = vault.tokenMint;
  } else {
    vault = vaultOrId;
    mintStr = vault.tokenMint;
  }

  const maxHolders = vault.maxHolders ?? TOP_HOLDERS;
  const now = new Date();

  // Step 1: Fast RPC call — gets top ~20 holders sorted by balance (free, 1 call)
  const { holders: rpcHolders, totalAccounts } = await fetchHoldersViaRpc(mintStr, maxHolders);

  let holders: { wallet: string; balance: bigint }[];

  // getTokenLargestAccounts returns at most ~20 results.
  // If it returned 20 non-zero accounts, there are likely more holders beyond RPC's limit.
  if (totalAccounts < 20) {
    holders = rpcHolders;
  } else {
    // Token likely has more holders — use Helius DAS for full list
    const dasHolders = await fetchTopHolders(mintStr, maxHolders);
    holders = dasHolders ?? rpcHolders; // fallback to RPC if DAS unavailable
  }

  // Batch upsert holder balances in a single transaction
  const currentWallets = new Set(holders.map((h) => h.wallet));
  const walletArray = [...currentWallets];

  // Build the zero-out op with balanceZeroSince support
  // When balance goes >0 -> 0, set balanceZeroSince once (don't reset each cycle)
  const zeroOutOp = walletArray.length > 0
    ? prisma.$executeRawUnsafe(
        `UPDATE "HolderBalance"
         SET "balance" = 0,
             "lastUpdated" = $2,
             "balanceZeroSince" = CASE
               WHEN "balance" > 0 THEN $2
               ELSE "balanceZeroSince"
             END
         WHERE "vaultId" = $1
           AND "wallet" NOT IN (${walletArray.map((_, i) => `$${i + 3}`).join(", ")})
           AND "balance" != 0`,
        vault.id,
        now,
        ...walletArray
      )
    : prisma.$executeRawUnsafe(
        `UPDATE "HolderBalance"
         SET "balance" = 0,
             "lastUpdated" = $2,
             "balanceZeroSince" = CASE
               WHEN "balance" > 0 THEN $2
               ELSE "balanceZeroSince"
             END
         WHERE "vaultId" = $1 AND "balance" != 0`,
        vault.id,
        now
      );

  await prisma.$transaction([
    // Upsert all current holders via raw SQL for batch efficiency
    // When balance goes 0 -> >0, clear balanceZeroSince (holder returned)
    ...holders.map((holder) =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "HolderBalance" ("vaultId", "wallet", "balance", "holdingSince", "lastUpdated", "balanceZeroSince")
         VALUES ($1, $2, $3::bigint, $4, $4, NULL)
         ON CONFLICT ("vaultId", "wallet") DO UPDATE SET
           "balance" = $3::bigint,
           "holdingSince" = CASE
             WHEN "HolderBalance"."balance" = 0 THEN $4
             ELSE "HolderBalance"."holdingSince"
           END,
           "lastUpdated" = $4,
           "balanceZeroSince" = CASE
             WHEN "HolderBalance"."balance" = 0 THEN NULL
             ELSE "HolderBalance"."balanceZeroSince"
           END`,
        vault.id,
        holder.wallet,
        holder.balance,
        now
      )
    ),
    // Zero out holders no longer in top list and set balanceZeroSince
    zeroOutOp,
  ]);
}

/**
 * Fallback: fetch holders via standard Solana RPC (getTokenLargestAccounts).
 * Limited to ~20 results by the RPC spec.
 */
async function fetchHoldersViaRpc(
  mintStr: string,
  maxHolders: number
): Promise<{ holders: { wallet: string; balance: bigint }[]; totalAccounts: number }> {
  const mint = new PublicKey(mintStr);
  const result = await connection.getTokenLargestAccounts(mint);

  const topAccounts = result.value.filter((a) => a.uiAmount && a.uiAmount > 0);

  // Batch-fetch all token account info in one RPC call
  const accountInfos = await connection.getMultipleAccountsInfo(
    topAccounts.map((a) => a.address)
  );

  const holders: { wallet: string; balance: bigint }[] = [];
  for (let i = 0; i < topAccounts.length; i++) {
    const info = accountInfos[i];
    if (!info) continue;

    // Parse SPL token account: owner is at offset 32 (after mint pubkey)
    const owner = new PublicKey(info.data.subarray(32, 64));
    const ownerStr = owner.toBase58();

    // Skip any off-curve address (PDA) — lock contracts, AMM pools, bonding curves, etc.
    if (!PublicKey.isOnCurve(owner.toBytes())) continue;

    holders.push({
      wallet: ownerStr,
      balance: BigInt(topAccounts[i].amount),
    });

    if (holders.length >= maxHolders) break;
  }

  return { holders, totalAccounts: topAccounts.length };
}
