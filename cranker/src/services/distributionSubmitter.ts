import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { connection, DISTRIBUTION_INTERVAL_MS, DUST_THRESHOLD_LAMPORTS, VAULT_CONCURRENCY } from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import {
  program,
  derivePlatformConfigPda,
  deriveVaultPda,
  deriveVaultPoolPda,
  deriveDistributionPda,
} from "../utils/anchor";
import {
  safeReadU64,
  VAULT_TOTAL_CLAIMED_OFFSET,
  DISTRIBUTION_TOTAL_ALLOCATED_OFFSET,
} from "../utils/onchain";
import { buildDistribution } from "./merkleBuilder";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";

/**
 * For a batch of vaults, check if it's time to submit a new distribution.
 * Returns per-vault success/failure results for health tracking.
 */
export async function submitDistributions(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await submitDistributionForVault(vault.id, vault.tokenMint);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[distribute] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function submitDistributionForVault(
  vaultId: number,
  mintStr: string
): Promise<void> {
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
  const [distPda] = deriveDistributionPda(mint);

  // Fetch all three in parallel — they're independent RPC calls
  const [poolBalance, vaultInfo, distInfo] = await Promise.all([
    connection.getBalance(vaultPool),
    connection.getAccountInfo(vaultPda),
    connection.getAccountInfo(distPda),
  ]);

  if (poolBalance <= DUST_THRESHOLD_LAMPORTS) return;
  if (!vaultInfo || !distInfo) return;

  const totalClaimed = safeReadU64(vaultInfo.data, VAULT_TOTAL_CLAIMED_OFFSET);
  const totalAllocated = safeReadU64(distInfo.data, DISTRIBUTION_TOTAL_ALLOCATED_OFFSET);
  if (totalClaimed === null || totalAllocated === null) {
    console.warn(`[distribute] ${mintStr}: unexpected account data length, skipping`);
    return;
  }

  // Build distribution
  const result = await buildDistribution(
    vaultId,
    mintStr,
    BigInt(poolBalance),
    totalAllocated,
    totalClaimed
  );

  if (!result) {
    console.log(`[distribute] ${mintStr}: no new fees to distribute`);
    return;
  }

  console.log(
    `[distribute] ${mintStr}: submitting root for ${result.holderCount} holders, totalAllocated=${result.totalAllocated}, platformFee=${result.platformFee}, lpShare=${result.lpShare}`
  );

  // Submit on-chain TX
  const [platformConfig] = derivePlatformConfigPda();
  const merkleRootArray = [...result.merkleRoot] as number[];

  const tx = await (program.methods as any)
    .updateDistribution(
      merkleRootArray,
      new BN(result.totalAllocated.toString())
    )
    .accounts({
      cranker: program.provider.publicKey!,
      platformConfig,
      vault: vaultPda,
      vaultPool,
      distributionState: distPda,
    })
    .rpc();

  console.log(`[distribute] ${mintStr}: submitted, tx=${tx}`);

  // Store in DB
  const epochNumber = lastDist ? lastDist.epochNumber + 1 : 1;
  const distRecord = await prisma.distributionRecord.create({
    data: {
      vaultId,
      epochNumber,
      merkleRoot: result.merkleRoot.toString("hex"),
      totalAllocated: result.totalAllocated,
      holderCount: result.holderCount,
      txSignature: tx,
    },
  });

  await prisma.allocationRecord.createMany({
    data: result.allocations.map((a) => ({
      distributionId: distRecord.id,
      wallet: a.wallet,
      cumulativeAmount: a.cumulativeAmount,
      score: a.score,
      proof: JSON.stringify(a.proof.map((p) => p.toString("hex"))),
    })),
  });
}
