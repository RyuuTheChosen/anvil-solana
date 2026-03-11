import { prisma } from "../db/client";
import { decryptSecretKey } from "./crypto";

interface ClaimedKeypair {
  publicKey: string;
  secretKey: Uint8Array;
}

interface RawClaimRow {
  id: number;
  publicKey: string;
  encryptedKey: string;
}

/**
 * Atomically claim an unclaimed vanity keypair from the pool.
 * Uses FOR UPDATE SKIP LOCKED to prevent double-claim races.
 * Returns null if the pool is empty.
 */
export async function claimKeypair(suffix: string): Promise<ClaimedKeypair | null> {
  const rows = await prisma.$queryRaw<RawClaimRow[]>`
    UPDATE "VanityKeypair"
    SET claimed = true, "claimedAt" = NOW()
    WHERE id = (
      SELECT id FROM "VanityKeypair"
      WHERE claimed = false AND "confirmedOnChain" = false AND suffix = ${suffix}
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "publicKey", "encryptedKey"
  `;

  if (rows.length === 0) return null;

  const secretKey = decryptSecretKey(rows[0].encryptedKey);
  return { publicKey: rows[0].publicKey, secretKey };
}

/**
 * Mark a vanity keypair as confirmed on-chain (permanently consumed).
 * Called from /confirm after the token creation TX is verified.
 * Silently ignores non-vanity mints (no matching row).
 */
export async function markConfirmedOnChain(publicKey: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "VanityKeypair"
    SET "confirmedOnChain" = true
    WHERE "publicKey" = ${publicKey}
  `;
}

/**
 * Get the number of available (unclaimed) vanity keypairs.
 */
export async function getVanityPoolSize(suffix: string): Promise<number> {
  return prisma.vanityKeypair.count({
    where: { claimed: false, suffix },
  });
}

/**
 * Reclaim vanity keypairs that were claimed but never confirmed on-chain.
 * Called periodically to recycle keypairs from abandoned launches.
 * Returns the number of keypairs reclaimed.
 */
export async function reclaimExpiredKeypairs(ttlMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - ttlMs);
  return prisma.$executeRaw`
    UPDATE "VanityKeypair"
    SET claimed = false, "claimedAt" = NULL
    WHERE claimed = true
      AND "confirmedOnChain" = false
      AND "claimedAt" < ${cutoff}
  `;
}
