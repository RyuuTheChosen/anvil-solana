import { PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { OnlinePumpSdk, feeSharingConfigPda, creatorVaultPda } from "@pump-fun/pump-sdk";
import { connection, crankerKeypair, DUST_THRESHOLD_LAMPORTS, VAULT_CONCURRENCY } from "../config";
import { pMap } from "../utils/concurrency";
import type { Vault } from "@prisma/client";
import type { StepResult } from "../utils/health";

let onlineSdk: OnlinePumpSdk | null = null;

function getOnlineSdk(): OnlinePumpSdk {
  if (!onlineSdk) {
    onlineSdk = new OnlinePumpSdk(connection);
  }
  return onlineSdk;
}

/**
 * Collect PumpFun creator fees for a batch of vaults.
 * Calls PumpFun's distributeCreatorFees to move fees from PumpFun's
 * creator vault to Anvil's fee_account PDA (the configured shareholder).
 * Must run BEFORE deposit_fees (which sweeps fee_account -> vault_pool).
 */
export async function collectPumpFees(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await collectForVault(vault.tokenMint);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[collect-pf] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function collectForVault(mintStr: string): Promise<void> {
  const mint = new PublicKey(mintStr);

  // Check creator vault balance before building IXs to avoid unnecessary RPC calls
  const sharingConfigKey = feeSharingConfigPda(mint);
  const creatorVault = creatorVaultPda(sharingConfigKey);
  const balance = await connection.getBalance(creatorVault);
  if (balance <= DUST_THRESHOLD_LAMPORTS) return;

  // Build PumpFun distribute instructions.
  // Handles both graduated (AMM consolidation + distribute) and non-graduated tokens.
  let result;
  try {
    result = await getOnlineSdk().buildDistributeCreatorFeesInstructions(mint);
  } catch (err: any) {
    // No sharing config = token wasn't configured for fee sharing, skip
    if (err.message?.includes("Sharing config not found")) return;
    throw err;
  }

  if (result.instructions.length === 0) return;

  const tx = new Transaction();
  result.instructions.forEach((ix) => tx.add(ix));

  // sendAndConfirmTransaction runs preflight simulation by default.
  // If the creator vault is empty, preflight rejects — no TX fee wasted.
  const sig = await sendAndConfirmTransaction(connection, tx, [crankerKeypair], {
    commitment: "confirmed",
  });

  console.log(`[collect-pf] ${mintStr}: collected PumpFun fees, graduated=${result.isGraduated}, tx=${sig}`);
}
