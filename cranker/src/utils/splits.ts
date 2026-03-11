/**
 * Shared validation + split math for platform fees and holder/LP/buyback splits.
 */

export function validateHolderSplitBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10000;
}

export interface SplitResult {
  platformFee: bigint;
  holderShare: bigint;
  lpShare: bigint;
  buybackShare: bigint;
}

/**
 * Compute the four-way split of new fees:
 *   1. Platform fee (deducted first)
 *   2. Holder share (holderSplitBps of remainder)
 *   3. Buyback share (buybackSplitBps of remainder)
 *   4. LP share (the rest)
 *
 * holderSplitBps + buybackSplitBps must be <= 10000.
 * If buybackSplitBps is 0 or omitted, behaves identically to the old 3-way split.
 */
export function computeSplits(
  totalLamports: bigint,
  platformFeeBps: number,
  holderSplitBps: number,
  buybackSplitBps: number = 0
): SplitResult {
  if (totalLamports <= 0n) {
    return { platformFee: 0n, holderShare: 0n, lpShare: 0n, buybackShare: 0n };
  }

  const platformFee = (totalLamports * BigInt(platformFeeBps)) / 10000n;
  const remaining = totalLamports - platformFee;
  const holderShare = (remaining * BigInt(holderSplitBps)) / 10000n;
  const buybackShare = buybackSplitBps > 0
    ? (remaining * BigInt(buybackSplitBps)) / 10000n
    : 0n;
  const lpShare = remaining - holderShare - buybackShare;

  return { platformFee, holderShare, lpShare, buybackShare };
}
