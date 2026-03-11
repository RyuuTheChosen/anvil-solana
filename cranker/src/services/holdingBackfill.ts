import { PublicKey } from "@solana/web3.js";
import { connection } from "../config";
import { prisma } from "../db/client";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const activeBackfills = new Set<number>();

/**
 * Backfill holdingSince for all holders of a vault by looking up each holder's
 * earliest token account transaction on-chain.
 *
 * Called once when a vault is first registered. For each holder, we find their
 * actual token accounts for the mint via getTokenAccountsByOwner, then walk
 * getSignaturesForAddress backwards to find the oldest transaction timestamp.
 */
export async function backfillHoldingTimes(vaultId: number, mintStr: string): Promise<void> {
  if (activeBackfills.has(vaultId)) {
    console.log(`[backfill] Already running for vault ${vaultId}, skipping`);
    return;
  }
  activeBackfills.add(vaultId);
  try {
    await doBackfill(vaultId, mintStr);
  } finally {
    activeBackfills.delete(vaultId);
  }
}

async function doBackfill(vaultId: number, mintStr: string): Promise<void> {
  const mint = new PublicKey(mintStr);

  const holders = await prisma.holderBalance.findMany({
    where: { vaultId, balance: { gt: 0n } },
  });

  if (holders.length === 0) return;

  console.log(`[backfill] Starting for ${mintStr} — ${holders.length} holders`);

  for (const holder of holders) {
    try {
      let walletPubkey: PublicKey;
      try {
        walletPubkey = new PublicKey(holder.wallet);
      } catch {
        console.warn(`[backfill] Skipping invalid wallet: ${holder.wallet}`);
        continue;
      }

      // Find the actual token accounts this wallet has for this mint
      const tokenAccounts = await connection.getTokenAccountsByOwner(walletPubkey, {
        mint,
        programId: TOKEN_PROGRAM_ID,
      });

      if (tokenAccounts.value.length === 0) continue;

      // Check oldest signature across all token accounts for this mint
      let earliest: Date | null = null;
      for (const { pubkey } of tokenAccounts.value) {
        const time = await getOldestSignatureTime(pubkey);
        if (time && (!earliest || time < earliest)) {
          earliest = time;
        }
      }

      if (earliest && earliest < holder.holdingSince) {
        await prisma.holderBalance.update({
          where: { id: holder.id },
          data: { holdingSince: earliest },
        });
        console.log(`[backfill] ${holder.wallet} — holdingSince set to ${earliest.toISOString()}`);
      }
    } catch (err) {
      console.error(`[backfill] Error for ${holder.wallet}:`, err);
    }
  }

  console.log(`[backfill] Done for ${mintStr}`);
}

/**
 * Walk getSignaturesForAddress backwards to find the oldest transaction
 * for a given account. Returns the blockTime as a Date, or null if not found.
 */
async function getOldestSignatureTime(account: PublicKey): Promise<Date | null> {
  let oldestBlockTime: number | null = null;
  let before: string | undefined = undefined;

  const MAX_PAGES = 5; // Cap at 5000 signatures — prevents RPC quota exhaustion

  for (let page = 0; page < MAX_PAGES; page++) {
    const sigs = await connection.getSignaturesForAddress(account, {
      limit: 1000,
      before,
    });

    if (sigs.length === 0) break;

    // Last entry in the batch is the oldest so far
    const last = sigs[sigs.length - 1];
    if (last.blockTime) oldestBlockTime = last.blockTime;
    before = last.signature;

    // If we got fewer than 1000, we've reached the end
    if (sigs.length < 1000) break;
  }

  return oldestBlockTime ? new Date(oldestBlockTime * 1000) : null;
}
