import { PublicKey } from "@solana/web3.js";
import {
  connection,
  DISTRIBUTION_INTERVAL_MS,
  DUST_THRESHOLD_LAMPORTS,
  VAULT_CONCURRENCY,
  MIN_DISTRIBUTION_THRESHOLD,
  MAX_DISTRIBUTION_INTERVAL_MS,
  PUSH_DUST_THRESHOLD,
  PUSH_BATCH_SIZE,
  DRIP_RATE_BPS,
} from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import {
  deriveVaultPda,
  deriveVaultPoolPda,
  callPushBatch,
} from "../utils/anchor";
import {
  safeReadU64,
  VAULT_TOTAL_CLAIMED_OFFSET,
  VAULT_TOTAL_ALLOCATED_OFFSET,
} from "../utils/onchain";
import { calculateDistribution, type DistributionPlan } from "./distributionCalculator";
import { computeSplits } from "../utils/splits";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";

/**
 * Push distributions for a batch of push-mode vaults.
 */
export async function pushDistributions(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await pushDistributionForVault(vault);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[push] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function pushDistributionForVault(vault: Vault): Promise<void> {
  const vaultId = vault.id;
  const mintStr = vault.tokenMint;

  // Check for incomplete push from previous run — resume if found
  const incompleteDist = await prisma.distributionRecord.findFirst({
    where: { vaultId, pushCompleted: false },
    orderBy: { epochNumber: "desc" },
    include: { allocations: true },
  });

  if (incompleteDist) {
    console.log(`[push] ${mintStr}: resuming incomplete push for epoch ${incompleteDist.epochNumber}`);
    await resumePush(vault, incompleteDist);
    return;
  }

  // Check timing
  const lastDist = await prisma.distributionRecord.findFirst({
    where: { vaultId },
    orderBy: { epochNumber: "desc" },
  });

  if (lastDist) {
    const elapsed = Date.now() - lastDist.createdAt.getTime();
    if (elapsed < DISTRIBUTION_INTERVAL_MS) return;
  }

  const mint = new PublicKey(mintStr);
  const [vaultPda] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);

  // Fetch on-chain state (push mode reads both fields from Vault account)
  const [poolBalance, vaultInfo] = await Promise.all([
    connection.getBalance(vaultPool),
    connection.getAccountInfo(vaultPda),
  ]);

  if (poolBalance <= DUST_THRESHOLD_LAMPORTS) return;
  if (!vaultInfo) return;

  const totalClaimed = safeReadU64(vaultInfo.data, VAULT_TOTAL_CLAIMED_OFFSET);
  const totalAllocated = safeReadU64(vaultInfo.data, VAULT_TOTAL_ALLOCATED_OFFSET);
  if (totalClaimed === null || totalAllocated === null) {
    console.warn(`[push] ${mintStr}: unexpected account data length, skipping`);
    return;
  }

  // Adaptive threshold check
  if (!shouldDistribute(vault, BigInt(poolBalance), totalAllocated, totalClaimed)) {
    return;
  }

  // Calculate distribution
  const plan = await calculateDistribution(
    vaultId,
    mintStr,
    BigInt(poolBalance),
    totalAllocated,
    totalClaimed
  );

  if (!plan) {
    console.log(`[push] ${mintStr}: no new fees to distribute`);
    return;
  }

  // Filter out dust (holders whose incremental share < tx fee)
  const pushable = plan.allocations.filter(
    (a) => a.incrementalAmount >= PUSH_DUST_THRESHOLD
  );

  if (pushable.length === 0) {
    console.log(`[push] ${mintStr}: all holders below dust threshold, carrying forward`);
    // Still write allocation records for carry-forward
    await writeDistributionRecord(vault, plan, 0, true);
    return;
  }

  console.log(
    `[push] ${mintStr}: pushing to ${pushable.length} holders (${plan.allocations.length - pushable.length} dust-skipped), ` +
    `totalAllocated=${plan.totalAllocated}, platformFee=${plan.platformFee}, lpShare=${plan.lpShare}`
  );

  // Write DistributionRecord + AllocationRecords first
  const distRecord = await writeDistributionRecord(vault, plan, pushable.length, false);

  // Execute batched pushes
  let totalPushed = 0n;
  let batchCount = 0;

  for (let i = 0; i < pushable.length; i += PUSH_BATCH_SIZE) {
    const batch = pushable.slice(i, i + PUSH_BATCH_SIZE);
    const batchIndex = batchCount;

    // Phase 1: Write PushRecords with status "pending" BEFORE TX
    await prisma.pushRecord.createMany({
      data: batch.map((a) => ({
        distributionId: distRecord.id,
        wallet: a.wallet,
        amount: a.incrementalAmount,
        batchIndex,
        status: "pending",
      })),
      skipDuplicates: true,
    });

    // Phase 2: Submit push_batch on-chain
    const batchAmounts = batch.map((a) => a.incrementalAmount);
    const batchRecipients = batch.map((a) => new PublicKey(a.wallet));
    const batchTotal = batchAmounts.reduce((s, a) => s + a, 0n);

    try {
      const txSig = await callPushBatch(
        mint,
        batchTotal, // new_allocation = batch total (fresh distribution)
        batchAmounts,
        batchRecipients
      );

      console.log(`[push] ${mintStr}: batch ${batchIndex} TX: ${txSig}`);

      // Phase 3: Mark confirmed + increment totalReceived atomically
      await prisma.$transaction([
        // Update push records
        ...batch.map((a) =>
          prisma.pushRecord.update({
            where: {
              distributionId_wallet: {
                distributionId: distRecord.id,
                wallet: a.wallet,
              },
            },
            data: {
              status: "confirmed",
              batchTxSig: txSig,
            },
          })
        ),
        // Increment totalReceived for each holder
        ...batch.map((a) =>
          prisma.holderBalance.update({
            where: { vaultId_wallet: { vaultId, wallet: a.wallet } },
            data: { totalReceived: { increment: a.incrementalAmount } },
          })
        ),
      ]);

      totalPushed += batchTotal;
      batchCount++;
    } catch (err) {
      console.error(`[push] ${mintStr}: batch ${batchIndex} failed:`, err);

      // Mark failed
      await prisma.pushRecord.updateMany({
        where: {
          distributionId: distRecord.id,
          batchIndex,
          status: "pending",
        },
        data: {
          status: "failed",
        },
      });

      // Don't continue to next batch — let crash recovery handle
      break;
    }
  }

  // Finalize: mark completed, update vault state
  const allPushed = totalPushed > 0n;
  // Calculate carry-forward: total incremental minus what was actually pushed
  const totalIncremental = plan.allocations.reduce(
    (sum, a) => sum + a.incrementalAmount, 0n
  );
  const carryForward = totalIncremental - totalPushed;

  await prisma.$transaction([
    prisma.distributionRecord.update({
      where: { id: distRecord.id },
      data: {
        pushCompleted: true,
        totalPushed,
        pushBatchCount: batchCount,
      },
    }),
    prisma.vault.update({
      where: { id: vaultId },
      data: {
        lastDistributionAt: new Date(),
        totalOutstandingPush: carryForward,
      },
    }),
  ]);

  if (allPushed) {
    console.log(
      `[push] ${mintStr}: completed, pushed ${totalPushed} lamports in ${batchCount} batches`
    );
  }
}

/**
 * Adaptive threshold — should we distribute for this vault now?
 */
function shouldDistribute(
  vault: Vault,
  poolLamports: bigint,
  totalAllocated: bigint,
  totalClaimed: bigint
): boolean {
  // Calculate new fees
  const distributablePool = poolLamports - vault.pendingLpSol;
  const expiredUnclaimed = vault.expiredUnclaimedTotal;
  const rawOutstanding = vault.totalOutstandingPush;
  const effectiveOutstanding = rawOutstanding > expiredUnclaimed
    ? rawOutstanding - expiredUnclaimed
    : 0n;
  const newFees = distributablePool - effectiveOutstanding;

  if (newFees <= 0n) return false;

  // Check if dripped holder share meets threshold
  const dripAmount = newFees * BigInt(DRIP_RATE_BPS) / 10000n;
  const { holderShare } = computeSplits(
    dripAmount,
    vault.platformFeeBps,
    vault.holderSplitBps
  );

  if (holderShare >= MIN_DISTRIBUTION_THRESHOLD) return true;

  // 24h max interval fallback
  const lastDistTime = vault.lastDistributionAt?.getTime() ?? 0;
  const timeSinceLast = Date.now() - lastDistTime;
  if (timeSinceLast >= MAX_DISTRIBUTION_INTERVAL_MS) return true;

  return false;
}

/**
 * Resume an incomplete push (crash recovery).
 */
async function resumePush(
  vault: Vault,
  distRecord: { id: number; epochNumber: number; allocations: { wallet: string; cumulativeAmount: bigint }[] }
): Promise<void> {
  const vaultId = vault.id;
  const mintStr = vault.tokenMint;
  const mint = new PublicKey(mintStr);

  // Find pending/failed push records
  const pendingRecords = await prisma.pushRecord.findMany({
    where: {
      distributionId: distRecord.id,
      status: { in: ["pending", "failed"] },
    },
  });

  if (pendingRecords.length === 0) {
    // All records are confirmed — just finalize
    await prisma.distributionRecord.update({
      where: { id: distRecord.id },
      data: { pushCompleted: true },
    });
    return;
  }

  // Check if pending TXs were actually confirmed on-chain
  for (const record of pendingRecords) {
    if (record.batchTxSig && record.status === "pending") {
      try {
        const status = await connection.getSignatureStatus(record.batchTxSig);
        if (status?.value?.confirmationStatus === "confirmed" || status?.value?.confirmationStatus === "finalized") {
          // TX confirmed — update record + totalReceived
          await prisma.$transaction([
            prisma.pushRecord.update({
              where: { id: record.id },
              data: { status: "confirmed" },
            }),
            prisma.holderBalance.update({
              where: { vaultId_wallet: { vaultId, wallet: record.wallet } },
              data: { totalReceived: { increment: record.amount } },
            }),
          ]);
          continue;
        }
      } catch {
        // Can't verify — treat as needing re-push
      }
    }
  }

  // Re-fetch to see what's still unconfirmed
  const remaining = await prisma.pushRecord.findMany({
    where: {
      distributionId: distRecord.id,
      status: { in: ["pending", "failed"] },
    },
  });

  if (remaining.length === 0) {
    await prisma.distributionRecord.update({
      where: { id: distRecord.id },
      data: { pushCompleted: true },
    });
    return;
  }

  // Filter out records below rent-exempt threshold (would fail on-chain for new wallets)
  const pushable = remaining.filter((r) => r.amount >= PUSH_DUST_THRESHOLD);
  const rentSkipped = remaining.filter((r) => r.amount < PUSH_DUST_THRESHOLD);

  if (rentSkipped.length > 0) {
    console.log(`[push-resume] ${mintStr}: skipping ${rentSkipped.length} records below rent-exempt threshold`);
    await prisma.pushRecord.updateMany({
      where: { id: { in: rentSkipped.map((r) => r.id) } },
      data: { status: "skipped" },
    });
  }

  if (pushable.length === 0) {
    await prisma.$transaction([
      prisma.distributionRecord.update({
        where: { id: distRecord.id },
        data: { pushCompleted: true, totalPushed: 0n },
      }),
      prisma.vault.update({
        where: { id: vaultId },
        data: { lastDistributionAt: new Date() },
      }),
    ]);
    console.log(`[push-resume] ${mintStr}: all remaining records below threshold, marking complete`);
    return;
  }

  // Re-batch and push remaining
  let totalPushed = 0n;
  let batchCount = 0;
  const maxBatchIndex = await prisma.pushRecord.aggregate({
    where: { distributionId: distRecord.id },
    _max: { batchIndex: true },
  });
  let nextBatchIndex = (maxBatchIndex._max.batchIndex ?? -1) + 1;

  for (let i = 0; i < pushable.length; i += PUSH_BATCH_SIZE) {
    const batch = pushable.slice(i, i + PUSH_BATCH_SIZE);
    const batchAmounts = batch.map((r) => r.amount);
    const batchRecipients = batch.map((r) => new PublicKey(r.wallet));
    const batchTotal = batchAmounts.reduce((s, a) => s + a, 0n);

    try {
      const txSig = await callPushBatch(
        mint,
        batchTotal, // new_allocation = batch total
        batchAmounts,
        batchRecipients
      );

      console.log(`[push-resume] ${mintStr}: batch ${nextBatchIndex} TX: ${txSig}`);

      await prisma.$transaction([
        ...batch.map((r) =>
          prisma.pushRecord.update({
            where: { id: r.id },
            data: {
              status: "confirmed",
              batchTxSig: txSig,
              batchIndex: nextBatchIndex,
            },
          })
        ),
        ...batch.map((r) =>
          prisma.holderBalance.update({
            where: { vaultId_wallet: { vaultId, wallet: r.wallet } },
            data: { totalReceived: { increment: r.amount } },
          })
        ),
      ]);

      totalPushed += batchTotal;
      batchCount++;
      nextBatchIndex++;
    } catch (err) {
      console.error(`[push-resume] ${mintStr}: batch ${nextBatchIndex} failed:`, err);

      await prisma.pushRecord.updateMany({
        where: {
          id: { in: batch.map((r) => r.id) },
        },
        data: { status: "failed" },
      });

      break;
    }
  }

  // Check if all records are now confirmed
  const stillPending = await prisma.pushRecord.count({
    where: {
      distributionId: distRecord.id,
      status: { in: ["pending", "failed"] },
    },
  });

  if (stillPending === 0) {
    // Calculate final stats
    const confirmed = await prisma.pushRecord.aggregate({
      where: {
        distributionId: distRecord.id,
        status: "confirmed",
      },
      _sum: { amount: true },
      _count: true,
    });

    await prisma.$transaction([
      prisma.distributionRecord.update({
        where: { id: distRecord.id },
        data: {
          pushCompleted: true,
          totalPushed: confirmed._sum.amount ?? 0n,
          pushBatchCount: batchCount,
        },
      }),
      prisma.vault.update({
        where: { id: vaultId },
        data: {
          lastDistributionAt: new Date(),
          totalOutstandingPush: 0n,
        },
      }),
    ]);

    console.log(`[push-resume] ${mintStr}: recovery complete`);
  }
}

/**
 * Write DistributionRecord + AllocationRecords to DB.
 */
async function writeDistributionRecord(
  vault: Vault,
  plan: DistributionPlan,
  pushableCount: number,
  completed: boolean
): Promise<{ id: number; epochNumber: number }> {
  const lastDist = await prisma.distributionRecord.findFirst({
    where: { vaultId: vault.id },
    orderBy: { epochNumber: "desc" },
  });

  const epochNumber = lastDist ? lastDist.epochNumber + 1 : 1;

  const distRecord = await prisma.distributionRecord.create({
    data: {
      vaultId: vault.id,
      epochNumber,
      merkleRoot: "0".repeat(64), // No Merkle root in push mode
      totalAllocated: plan.totalAllocated,
      holderCount: plan.holderCount,
      pushCompleted: completed,
      totalPushed: 0n,
      pushBatchCount: 0,
    },
  });

  // Write AllocationRecords (proof = "[]" in push mode, used for carry-forward)
  await prisma.allocationRecord.createMany({
    data: plan.allocations.map((a) => ({
      distributionId: distRecord.id,
      wallet: a.wallet,
      cumulativeAmount: a.cumulativeAmount,
      score: a.score,
      proof: "[]",
    })),
  });

  // Update vault outstanding push
  if (completed) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: {
        lastDistributionAt: new Date(),
        totalOutstandingPush: plan.newOutstandingPush,
      },
    });
  }

  return { id: distRecord.id, epochNumber };
}
