import { PublicKey } from "@solana/web3.js";
import { connection, DUST_THRESHOLD_LAMPORTS, VAULT_CONCURRENCY } from "../config";
import type { Vault } from "@prisma/client";
import {
  program,
  derivePlatformConfigPda,
  deriveFeeAccountPda,
  deriveVaultPda,
  deriveVaultPoolPda,
  deriveTreasuryPda,
} from "../utils/anchor";
import { pMap } from "../utils/concurrency";
import type { StepResult } from "../utils/health";

/**
 * Check fee_account balances for a batch of vaults.
 * If balance exceeds dust threshold, submit deposit_fees TX.
 * Returns per-vault success/failure results for health tracking.
 */
export async function checkAndDepositFees(vaults: Vault[]): Promise<StepResult[]> {
  return pMap(
    vaults,
    async (vault: Vault): Promise<StepResult> => {
      try {
        await depositFeesForVault(vault.tokenMint);
        return { vaultId: vault.id, mint: vault.tokenMint, success: true };
      } catch (err) {
        console.error(`[deposit] Error for ${vault.tokenMint}:`, err);
        return { vaultId: vault.id, mint: vault.tokenMint, success: false, error: err };
      }
    },
    VAULT_CONCURRENCY
  );
}

async function depositFeesForVault(mintStr: string): Promise<void> {
  const mint = new PublicKey(mintStr);
  const [feeAccount] = deriveFeeAccountPda(mint);

  const balance = await connection.getBalance(feeAccount);
  if (balance <= DUST_THRESHOLD_LAMPORTS) return;

  console.log(
    `[deposit] ${mintStr}: ${balance} lamports in fee account, depositing...`
  );

  const [platformConfig] = derivePlatformConfigPda();
  const [vaultPda] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);
  const [treasury] = deriveTreasuryPda();

  const tx = await (program.methods as any)
    .depositFees()
    .accounts({
      cranker: program.provider.publicKey!,
      platformConfig,
      vault: vaultPda,
      feeAccount,
      vaultPool,
      platformTreasury: treasury,
    })
    .rpc();

  console.log(`[deposit] ${mintStr}: deposited, tx=${tx}`);
}
