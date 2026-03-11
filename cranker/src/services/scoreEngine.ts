export interface HolderScore {
  wallet: string;
  balance: bigint;
  score: number;
}

/**
 * Compute scores for holders: balance * duration_multiplier.
 * duration_multiplier = min(sqrt(hours_held / 24), 10)
 * Duration resets to 0 when balance drops to 0.
 */
export function computeScores(
  holders: { wallet: string; balance: bigint; holdingSince: Date }[]
): HolderScore[] {
  const now = Date.now();

  return holders
    .filter((h) => h.balance > 0n)
    .map((h) => {
      const hoursHeld = (now - h.holdingSince.getTime()) / (1000 * 60 * 60);
      const durationMultiplier = Math.min(Math.sqrt(hoursHeld / 24), 10);
      // Scale down to avoid Number overflow. PumpFun tokens: 6 decimals, max supply ~1B = 1e15 raw.
      // Dividing by 1e6 keeps values well under MAX_SAFE_INTEGER (~9e15).
      const scaledBalance = Number(h.balance / 1_000_000n || 1n);
      const score = scaledBalance * Math.max(durationMultiplier, 0.1);

      return {
        wallet: h.wallet,
        balance: h.balance,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Allocate new fees pro-rata based on scores.
 * Returns share per wallet in lamports.
 */
export function allocateShares(
  scores: HolderScore[],
  newFeesLamports: bigint
): Map<string, bigint> {
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  if (totalScore === 0) return new Map();

  const shares = new Map<string, bigint>();
  let distributed = 0n;

  for (let i = 0; i < scores.length; i++) {
    const share =
      i === scores.length - 1
        ? newFeesLamports - distributed // last wallet gets remainder to avoid rounding dust
        : (newFeesLamports * BigInt(Math.round((scores[i].score / totalScore) * 1e9))) / 1_000_000_000n;
    shares.set(scores[i].wallet, share);
    distributed += share;
  }

  return shares;
}
