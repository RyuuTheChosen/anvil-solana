import { AnchorProvider, Program, Wallet, setProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { connection, crankerKeypair, ANVIL_PROGRAM_ID } from "../config";
import idl from "../idl/anvil_protocol.json";

// Seeds matching the on-chain constants
const PLATFORM_SEED = Buffer.from("anvil");
const PLATFORM_TAG = Buffer.from("platform");
const TREASURY_SEED = Buffer.from("treasury");
const VAULT_SEED = Buffer.from("vault");
const FEE_SEED = Buffer.from("fees");
const POOL_SEED = Buffer.from("pool");
const DISTRIBUTION_SEED = Buffer.from("distribution");
const CLAIM_SEED = Buffer.from("claimed");

// Anchor provider + program
const wallet = new Wallet(crankerKeypair);
export const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
setProvider(provider);

export const program = new Program(idl as any, provider);

// PDA derivation helpers
export function derivePlatformConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, PLATFORM_TAG],
    ANVIL_PROGRAM_ID
  );
}

export function deriveTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, TREASURY_SEED],
    ANVIL_PROGRAM_ID
  );
}

export function deriveVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, VAULT_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveFeeAccountPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, FEE_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveVaultPoolPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, POOL_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveDistributionPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [DISTRIBUTION_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveClaimPda(
  mint: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CLAIM_SEED, mint.toBuffer(), user.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

/**
 * Check if the on-chain platform is paused.
 * Reads the PlatformConfig account and returns the `paused` flag.
 */
export async function isPlatformPaused(): Promise<boolean> {
  try {
    const [pda] = derivePlatformConfigPda();
    const account = await (program.account as any).platformConfig.fetch(pda);
    return account.paused === true;
  } catch {
    // If we can't read the account, assume not paused to avoid blocking the cycle
    return false;
  }
}

/**
 * Call the on-chain push_batch instruction.
 * Transfers SOL from vault_pool to recipient wallets in a single atomic TX.
 */
export async function callPushBatch(
  mint: PublicKey,
  newAllocation: bigint,
  amounts: bigint[],
  recipients: PublicKey[]
): Promise<string> {
  const [platformConfig] = derivePlatformConfigPda();
  const [vault] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);

  const tx = await (program.methods as any)
    .pushBatch(
      new BN(newAllocation.toString()),
      amounts.map((a) => new BN(a.toString()))
    )
    .accounts({
      cranker: crankerKeypair.publicKey,
      platformConfig,
      vault,
      vaultPool,
      systemProgram: PublicKey.default,
    })
    .remainingAccounts(
      recipients.map((r) => ({
        pubkey: r,
        isSigner: false,
        isWritable: true,
      }))
    )
    .rpc();

  return tx;
}

/**
 * Call the on-chain withdraw_for_lp instruction.
 * Transfers `amount` lamports from the vault_pool PDA to the cranker wallet.
 */
export async function callWithdrawForLp(
  mint: PublicKey,
  amount: bigint
): Promise<string> {
  const [platformConfig] = derivePlatformConfigPda();
  const [vault] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);

  const tx = await (program.methods as any)
    .withdrawForLp(new BN(amount.toString()))
    .accounts({
      cranker: crankerKeypair.publicKey,
      platformConfig,
      vault,
      vaultPool,
      systemProgram: PublicKey.default,
    })
    .rpc();

  return tx;
}
