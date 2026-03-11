import { PublicKey } from "@solana/web3.js";
import { connection, VAULT_CONCURRENCY } from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";
import { bondingCurvePda } from "../utils/excludedAddresses";

// Bonding curve "complete" flag offset depends on account size:
// - Extended accounts (>200 bytes): complete at offset 309
// - Original accounts (<=200 bytes): complete at offset 48
//   Layout: 8 disc + 5×u64(40) + 1 bool(complete) = offset 48
const BC_COMPLETE_OFFSET_EXTENDED = 309;
const BC_COMPLETE_OFFSET_ORIGINAL = 48;

/**
 * Check non-graduated vaults in the batch for bonding curve completion.
 * Returns per-vault success/failure results for health tracking.
 */
export async function checkGraduation(vaults: Vault[]): Promise<StepResult[]> {
  // Self-heal: re-check graduated vaults to fix any false positives
  const allToCheck = vaults.filter((v) => !v.graduated || (v.graduated && !v.lpDeployed));
  if (allToCheck.length === 0) return [];

  return pMap(
    allToCheck,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await checkGraduationForVault(vault);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[graduation] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function checkGraduationForVault(vault: Vault): Promise<void> {
  const mint = new PublicKey(vault.tokenMint);
  const bcPda = bondingCurvePda(mint);

  const accountInfo = await connection.getAccountInfo(bcPda);

  // No bonding curve account — not a PumpFun token, skip
  if (!accountInfo) return;

  // Check if bonding curve is complete (offset depends on account size)
  const completeOffset = accountInfo.data.length > 200
    ? BC_COMPLETE_OFFSET_EXTENDED
    : BC_COMPLETE_OFFSET_ORIGINAL;
  const isComplete =
    accountInfo.data.length > completeOffset &&
    accountInfo.data[completeOffset] === 1;

  if (isComplete && !vault.graduated) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { graduated: true, graduatedAt: new Date() },
    });
    console.log(`[graduation] ${vault.tokenMint}: graduated!`);
    return;
  }

  // Self-heal: revert false graduation
  if (!isComplete && vault.graduated) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { graduated: false, graduatedAt: null },
    });
    console.log(`[graduation] ${vault.tokenMint}: reverted false graduation`);
    return;
  }

  // Pre-graduation LP fallback: if token hasn't graduated after 30 days,
  // redirect pendingLpSol back to holder distribution pool
  const daysSinceCreation =
    (Date.now() - vault.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreation > 30 && vault.pendingLpSol > 0n) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { pendingLpSol: 0n },
    });
    console.log(
      `[graduation] ${vault.tokenMint}: 30-day fallback — redirected ${vault.pendingLpSol} lamports pendingLpSol to holder pool`
    );
  }
}
