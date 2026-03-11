import { reclaimExpiredKeypairs } from "../vanity/keypairPool";

export interface PendingLaunch {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  metadataUri: string;
  imageUrl?: string;
  maxHolders: number;
  holderSplitBps: number;
  platformFeeBps: number;
  claimExpiryHours?: number;
  isVanity: boolean;
  createdAt: number;
}

const PENDING_TTL_MS = 15 * 60 * 1000; // 15 minutes

const pending = new Map<string, PendingLaunch>();

export function storePendingLaunch(data: Omit<PendingLaunch, "createdAt">): void {
  pending.set(data.mint, { ...data, createdAt: Date.now() });
}

export function getPendingLaunch(mint: string): PendingLaunch | null {
  const entry = pending.get(mint);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
    pending.delete(mint);
    return null;
  }
  return entry;
}

export function removePendingLaunch(mint: string): void {
  pending.delete(mint);
}

// Periodic cleanup: clear expired pending launches + reclaim expired vanity keypairs
setInterval(async () => {
  const now = Date.now();
  let expired = 0;
  for (const [mint, launch] of pending) {
    if (now - launch.createdAt > PENDING_TTL_MS) {
      pending.delete(mint);
      expired++;
    }
  }
  if (expired > 0) {
    console.log(`[pendingLaunches] Cleared ${expired} expired pending launches`);
  }

  try {
    const reclaimed = await reclaimExpiredKeypairs(PENDING_TTL_MS);
    if (reclaimed > 0) {
      console.log(`[pendingLaunches] Reclaimed ${reclaimed} expired vanity keypairs`);
    }
  } catch (err) {
    console.error("[pendingLaunches] Failed to reclaim expired keypairs:", err);
  }
}, 60_000);
