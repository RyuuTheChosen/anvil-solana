import { PublicKey } from "@solana/web3.js";
import { TOP_HOLDERS, MAX_TREE_LEAVES, DUST_THRESHOLD_LAMPORTS, DRIP_RATE_BPS } from "../config";
import { prisma } from "../db/client";
import { computeScores, allocateShares } from "./scoreEngine";
import { getOnChainClaimed } from "../utils/onchain";
import { computeSplits } from "../utils/splits";

/** Minimum platform fee worth tracking (below this is dust) */
const MIN_PLATFORM_FEE_LAMPORTS = 5000n;

export interface DistributionPlan {
  allocations: {
    wallet: string;
    cumulativeAmount: bigint;
    incrementalAmount: bigint;
    score: number;
  }[];
  totalAllocated: bigint;
  newFeesDistributed: bigint;
  platformFee: bigint;
  lpShare: bigint;
  buybackShare: bigint;
  holderCount: number;
  newOutstandingPush: bigint;
}

/**
 * Calculate distribution allocations for push mode.
 * Same allocation logic as merkleBuilder but no Merkle tree — returns
 * incremental amounts for each holder that need to be pushed.
 *
 * Returns null if there are no new fees to distribute.
 */
export async function calculateDistribution(
  vaultId: number,
  mintStr: string,
  poolLamports: bigint,
  lastTotalAllocated: bigint,
  lastTotalClaimed: bigint
): Promise<DistributionPlan | null> {
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) return null;

  // Pool balance includes pending LP + buyback SOL — subtract to get distributable balance
  const distributablePool = poolLamports - vault.pendingLpSol - vault.pendingBuybackSol;

  // Calculate new fees available, accounting for expired unclaimed allocations
  const expiredUnclaimed = vault.expiredUnclaimedTotal;

  // Push mode: use DB-tracked outstanding (carry-forward not yet pushed)
  // Pull mode: use on-chain outstanding
  let rawOutstanding: bigint;
  if (vault.distributionMode === "push") {
    rawOutstanding = vault.totalOutstandingPush;
  } else {
    rawOutstanding = lastTotalAllocated - lastTotalClaimed;
  }

  const effectiveOutstanding = rawOutstanding > expiredUnclaimed
    ? rawOutstanding - expiredUnclaimed
    : 0n;
  const newFees = distributablePool - effectiveOutstanding;
  if (newFees <= 0n) return null;

  // Drip: only distribute a fraction of new fees per interval
  const dripFees = newFees * BigInt(DRIP_RATE_BPS) / 10000n;
  if (dripFees <= 0n) return null;

  // Apply platform fee + holder/LP/buyback split
  const buybackBps = vault.buybackEnabled ? vault.buybackSplitBps : 0;
  const { platformFee, holderShare, lpShare, buybackShare } = computeSplits(
    dripFees,
    vault.platformFeeBps,
    vault.holderSplitBps,
    buybackBps
  );

  // Skip if platform fee is dust
  const trackablePlatformFee = platformFee >= MIN_PLATFORM_FEE_LAMPORTS ? platformFee : 0n;

  // Skip if holder share is below dust threshold
  if (holderShare <= BigInt(DUST_THRESHOLD_LAMPORTS)) {
    if (lpShare > 0n || buybackShare > 0n) {
      await prisma.vault.update({
        where: { id: vaultId },
        data: {
          ...(lpShare > 0n ? { pendingLpSol: { increment: lpShare } } : {}),
          ...(buybackShare > 0n ? { pendingBuybackSol: { increment: buybackShare } } : {}),
          ...(trackablePlatformFee > 0n ? { totalPlatformFees: { increment: trackablePlatformFee } } : {}),
        },
      });
    }
    return null;
  }

  // Get current top holders with scores (use per-vault maxHolders, fallback to global)
  const maxHolders = vault.maxHolders ?? TOP_HOLDERS;
  const holders = await prisma.holderBalance.findMany({
    where: { vaultId, balance: { gt: 0n } },
    orderBy: { balance: "desc" },
    take: maxHolders,
  });

  const scores = computeScores(holders);
  if (scores.length === 0) return null;

  // Allocate only holderShare pro-rata
  const shares = allocateShares(scores, holderShare);

  // Load previous allocations for carry-forward
  const prevDistribution = await prisma.distributionRecord.findFirst({
    where: { vaultId },
    orderBy: { epochNumber: "desc" },
  });

  const prevAllocations = prevDistribution
    ? await prisma.allocationRecord.findMany({
        where: { distributionId: prevDistribution.id },
        select: { wallet: true, cumulativeAmount: true },
      })
    : [];

  // Load expired wallets for this vault — exclude from carry-forward
  const expiredRecords = await prisma.expiredAllocation.findMany({
    where: { vaultId },
    select: { wallet: true, id: true, expiredAmount: true, cumulativeAmount: true, claimedAmount: true },
  });
  const expiredSet = new Set(expiredRecords.map((e) => e.wallet));

  // Build cumulative amounts map
  const cumulativeMap = new Map<string, { amount: bigint; score: number }>();

  // Carry forward previous allocations — skip expired and off-curve wallets
  for (const alloc of prevAllocations) {
    if (expiredSet.has(alloc.wallet)) continue;
    try {
      const pubkey = new PublicKey(alloc.wallet);
      if (!PublicKey.isOnCurve(pubkey.toBytes())) continue;
    } catch {
      continue;
    }
    cumulativeMap.set(alloc.wallet, {
      amount: alloc.cumulativeAmount,
      score: 0,
    });
  }

  // Handle returned wallets — if a current holder has an ExpiredAllocation, they're back
  const scoreMap = new Map(scores.map((s) => [s.wallet, s.score]));
  for (const [wallet] of scoreMap) {
    const expiredRecord = expiredRecords.find((e) => e.wallet === wallet);
    if (expiredRecord) {
      // Wallet bought back — un-expire
      await prisma.$transaction([
        prisma.expiredAllocation.delete({
          where: { id: expiredRecord.id },
        }),
        prisma.vault.update({
          where: { id: vaultId },
          data: { expiredUnclaimedTotal: { decrement: expiredRecord.expiredAmount } },
        }),
      ]);
      expiredSet.delete(wallet);

      // For push mode, floor at totalReceived from DB (not on-chain ClaimAccount)
      const holder = await prisma.holderBalance.findUnique({
        where: { vaultId_wallet: { vaultId, wallet } },
      });
      const alreadyReceived = holder?.totalReceived ?? 0n;
      if (alreadyReceived > 0n) {
        cumulativeMap.set(wallet, {
          amount: alreadyReceived,
          score: 0,
        });
      }
    }
  }

  // Add new shares to current top holders
  for (const [wallet, share] of shares) {
    const existing = cumulativeMap.get(wallet);
    const prevAmount = existing?.amount ?? 0n;
    cumulativeMap.set(wallet, {
      amount: prevAmount + share,
      score: scoreMap.get(wallet) ?? 0,
    });
  }

  // Update scores for carried-forward wallets that are still current holders
  for (const [wallet, score] of scoreMap) {
    const existing = cumulativeMap.get(wallet);
    if (existing && existing.score === 0) {
      existing.score = score;
    }
  }

  // Prune fully-received wallets not in current top holders
  const currentTopWallets = new Set(scores.map((s) => s.wallet));
  const toPrune: string[] = [];
  for (const [wallet, data] of cumulativeMap) {
    if (currentTopWallets.has(wallet)) continue;

    const holder = await prisma.holderBalance.findUnique({
      where: { vaultId_wallet: { vaultId, wallet } },
    });
    const alreadyReceived = holder?.totalReceived ?? 0n;
    if (alreadyReceived >= data.amount) {
      toPrune.push(wallet);
    }
  }
  for (const wallet of toPrune) {
    cumulativeMap.delete(wallet);
  }

  // Cap at MAX_TREE_LEAVES (same cap as merkle — keep allocation records consistent)
  if (cumulativeMap.size > MAX_TREE_LEAVES) {
    const safeToEvict: string[] = [];
    const sorted = [...cumulativeMap.entries()].sort((a, b) =>
      a[1].amount < b[1].amount ? -1 : a[1].amount > b[1].amount ? 1 : 0
    );
    for (const [wallet, data] of sorted) {
      if (cumulativeMap.size - safeToEvict.length <= MAX_TREE_LEAVES) break;
      const holder = await prisma.holderBalance.findUnique({
        where: { vaultId_wallet: { vaultId, wallet } },
      });
      const received = holder?.totalReceived ?? 0n;
      if (received >= data.amount) {
        safeToEvict.push(wallet);
      }
    }
    for (const wallet of safeToEvict) {
      cumulativeMap.delete(wallet);
    }
    if (cumulativeMap.size > MAX_TREE_LEAVES) {
      console.warn(
        `[push-calc] ${mintStr}: ${cumulativeMap.size} entries exceeds MAX_TREE_LEAVES (${MAX_TREE_LEAVES}), skipping`
      );
      return null;
    }
  }

  // Build allocation list with incremental amounts
  const allocations: DistributionPlan["allocations"] = [];
  for (const [wallet, data] of cumulativeMap) {
    const holder = await prisma.holderBalance.findUnique({
      where: { vaultId_wallet: { vaultId, wallet } },
    });
    const alreadyReceived = holder?.totalReceived ?? 0n;
    const incrementalAmount = data.amount - alreadyReceived;

    allocations.push({
      wallet,
      cumulativeAmount: data.amount,
      incrementalAmount: incrementalAmount > 0n ? incrementalAmount : 0n,
      score: data.score,
    });
  }

  // Calculate actual new fees distributed (sum of new shares added this epoch)
  const actualNewFeesDistributed = [...shares.values()].reduce(
    (sum, s) => sum + s,
    0n
  );
  const totalAllocated = lastTotalAllocated + actualNewFeesDistributed;

  // Safety assertion: ensure we never over-allocate beyond what the pool holds.
  // In push mode, DB-tracked outstanding is the source of truth and the fee
  // calculation above already guarantees holderShare < newFees < distributablePool.
  // The on-chain total_allocated can drift (e.g. LP withdrawals reduce pool without
  // touching total_allocated), so we only apply this check for pull-mode vaults.
  if (vault.distributionMode !== "push" && totalAllocated > poolLamports + lastTotalClaimed) {
    console.error(
      `[push-calc] ${mintStr}: totalAllocated (${totalAllocated}) would exceed pool (${poolLamports}) + claimed (${lastTotalClaimed}), aborting`
    );
    return null;
  }

  // Update vault DB with LP + buyback accumulation and platform fees
  await prisma.vault.update({
    where: { id: vaultId },
    data: {
      ...(lpShare > 0n ? { pendingLpSol: { increment: lpShare } } : {}),
      ...(buybackShare > 0n ? { pendingBuybackSol: { increment: buybackShare } } : {}),
      ...(trackablePlatformFee > 0n ? { totalPlatformFees: { increment: trackablePlatformFee } } : {}),
    },
  });

  // New outstanding push = sum of all incremental amounts (SOL spoken for but not pushed)
  const newOutstandingPush = allocations.reduce(
    (sum, a) => sum + a.incrementalAmount, 0n
  );

  return {
    allocations,
    totalAllocated,
    newFeesDistributed: actualNewFeesDistributed,
    platformFee: trackablePlatformFee,
    lpShare,
    buybackShare,
    holderCount: allocations.length,
    newOutstandingPush,
  };
}
