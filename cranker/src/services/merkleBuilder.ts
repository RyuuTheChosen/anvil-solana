import { PublicKey } from "@solana/web3.js";
import { TOP_HOLDERS, MAX_TREE_LEAVES, DUST_THRESHOLD_LAMPORTS, DRIP_RATE_BPS } from "../config";
import { prisma } from "../db/client";
import { computeScores, allocateShares } from "./scoreEngine";
import {
  buildMerkleTree,
  getProof,
  MerkleLeaf,
} from "../utils/merkle";
import { getOnChainClaimed } from "../utils/onchain";
import { computeSplits } from "../utils/splits";
import type { ExpiredAllocation } from "@prisma/client";

/** Minimum platform fee worth tracking (below this is dust) */
const MIN_PLATFORM_FEE_LAMPORTS = 5000n;

export interface DistributionResult {
  merkleRoot: Buffer;
  totalAllocated: bigint;
  holderCount: number;
  allocations: {
    wallet: string;
    cumulativeAmount: bigint;
    score: number;
    proof: Buffer[];
  }[];
  platformFee: bigint;
  lpShare: bigint;
}

/**
 * Build a new cumulative Merkle distribution for a vault.
 * Returns null if there are no new fees to distribute.
 *
 * The pool balance includes both holder allocation and pending LP SOL.
 * We must subtract pendingLpSol from poolLamports to get the actual
 * distributable balance, then split new fees via platform fee + holder/LP split.
 */
export async function buildDistribution(
  vaultId: number,
  mintStr: string,
  poolLamports: bigint,
  lastTotalAllocated: bigint,
  lastTotalClaimed: bigint
): Promise<DistributionResult | null> {
  // Load vault for split config and pending LP balance
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) return null;

  // Pool balance includes pending LP SOL — subtract it to get distributable balance
  const distributablePool = poolLamports - vault.pendingLpSol;

  // Calculate new fees available, accounting for expired unclaimed allocations
  // Expired allocations are SOL that's still in the pool but no longer owed to anyone
  const expiredUnclaimed = vault.expiredUnclaimedTotal;
  const rawOutstanding = lastTotalAllocated - lastTotalClaimed;
  const effectiveOutstanding = rawOutstanding > expiredUnclaimed
    ? rawOutstanding - expiredUnclaimed
    : 0n;
  const newFees = distributablePool - effectiveOutstanding;
  if (newFees <= 0n) return null;

  // Drip: only distribute a fraction of new fees per interval
  const dripFees = newFees * BigInt(DRIP_RATE_BPS) / 10000n;
  if (dripFees <= 0n) return null;

  // Apply platform fee + holder/LP split
  const { platformFee, holderShare, lpShare } = computeSplits(
    dripFees,
    vault.platformFeeBps,
    vault.holderSplitBps
  );

  // Skip if platform fee is dust
  const trackablePlatformFee = platformFee >= MIN_PLATFORM_FEE_LAMPORTS ? platformFee : 0n;

  // Skip if holder share is below dust threshold
  if (holderShare <= BigInt(DUST_THRESHOLD_LAMPORTS)) {
    // Still accumulate LP share even if holder share is dust
    if (lpShare > 0n) {
      await prisma.vault.update({
        where: { id: vaultId },
        data: {
          pendingLpSol: { increment: lpShare },
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

  // Allocate only holderShare (not full newFees) pro-rata
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
    if (expiredSet.has(alloc.wallet)) continue; // Skip expired wallets
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
  // Delete their expiry record and decrement expiredUnclaimedTotal
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

      // Floor at on-chain claimed amount so the program doesn't reject claims
      const onChainClaimed = await getOnChainClaimed(mintStr, wallet);
      if (onChainClaimed > 0n) {
        cumulativeMap.set(wallet, {
          amount: onChainClaimed,
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
  // (they may not be in `shares` if holderShare was 0 this cycle)
  for (const [wallet, score] of scoreMap) {
    const existing = cumulativeMap.get(wallet);
    if (existing && existing.score === 0) {
      existing.score = score;
    }
  }

  // Prune fully-claimed wallets
  const toPrune: string[] = [];

  // Only check carried-forward wallets not in current top holders
  const currentTopWallets = new Set(scores.map((s) => s.wallet));
  for (const [wallet, data] of cumulativeMap) {
    if (currentTopWallets.has(wallet)) continue;

    const claimedAmount = await getOnChainClaimed(mintStr, wallet);
    if (claimedAmount >= data.amount) {
      toPrune.push(wallet);
    }
  }

  for (const wallet of toPrune) {
    cumulativeMap.delete(wallet);
  }

  // Cap at MAX_TREE_LEAVES — only evict fully-claimed wallets
  if (cumulativeMap.size > MAX_TREE_LEAVES) {
    const safeToEvict: string[] = [];
    const sorted = [...cumulativeMap.entries()].sort((a, b) =>
      a[1].amount < b[1].amount ? -1 : a[1].amount > b[1].amount ? 1 : 0
    );

    for (const [wallet, data] of sorted) {
      if (cumulativeMap.size - safeToEvict.length <= MAX_TREE_LEAVES) break;
      const claimed = await getOnChainClaimed(mintStr, wallet);
      if (claimed >= data.amount) {
        safeToEvict.push(wallet);
      }
    }

    for (const wallet of safeToEvict) {
      cumulativeMap.delete(wallet);
    }

    // If still over limit, skip distribution — never silently drop unclaimed funds
    if (cumulativeMap.size > MAX_TREE_LEAVES) {
      console.warn(
        `[merkle] ${mintStr}: ${cumulativeMap.size} leaves exceeds MAX_TREE_LEAVES (${MAX_TREE_LEAVES}), ` +
        `${cumulativeMap.size - MAX_TREE_LEAVES} wallets have unclaimed funds — skipping distribution`
      );
      return null;
    }
  }

  // Build Merkle tree
  const leaves: MerkleLeaf[] = [...cumulativeMap.entries()].map(
    ([wallet, data]) => ({
      wallet: new PublicKey(wallet).toBuffer(),
      amount: data.amount,
    })
  );

  const tree = buildMerkleTree(leaves);

  // totalAllocated is cumulative across all epochs: previous + holder share actually distributed
  const actualNewFeesDistributed = [...shares.values()].reduce(
    (sum, s) => sum + s,
    0n
  );
  const totalAllocated = lastTotalAllocated + actualNewFeesDistributed;

  // Extract proofs
  const allocations = leaves.map((leaf, idx) => {
    const wallet = new PublicKey(leaf.wallet).toBase58();
    const data = cumulativeMap.get(wallet)!;
    return {
      wallet,
      cumulativeAmount: data.amount,
      score: data.score,
      proof: getProof(tree, idx),
    };
  });

  // Safety assertion: totalAllocated must not exceed what the pool can cover
  if (totalAllocated > poolLamports + lastTotalClaimed) {
    console.error(
      `[merkle] ${mintStr}: totalAllocated (${totalAllocated}) would exceed pool (${poolLamports}) + claimed (${lastTotalClaimed}), aborting`
    );
    return null;
  }

  // Update vault DB with LP accumulation and platform fees
  await prisma.vault.update({
    where: { id: vaultId },
    data: {
      ...(lpShare > 0n ? { pendingLpSol: { increment: lpShare } } : {}),
      ...(trackablePlatformFee > 0n ? { totalPlatformFees: { increment: trackablePlatformFee } } : {}),
    },
  });

  return {
    merkleRoot: tree.root,
    totalAllocated,
    holderCount: allocations.length,
    allocations,
    platformFee: trackablePlatformFee,
    lpShare,
  };
}
