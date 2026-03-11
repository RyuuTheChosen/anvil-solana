import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  PumpAmmSdk,
  OnlinePumpAmmSdk,
  canonicalPumpPoolPda,
  PUMP_AMM_PROGRAM_ID,
} from "@pump-fun/pump-swap-sdk";
import {
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { connection } from "../config";

export { NATIVE_MINT };

/** 3% slippage — hardcoded constant to prevent misconfiguration */
export const LP_SLIPPAGE = 0.03;

/** PumpAmmSdk singleton (offline — builds instructions from state objects) */
export const pumpAmmSdk = new PumpAmmSdk();

/** OnlinePumpAmmSdk singleton (fetches on-chain state into state objects) */
export const onlinePumpAmmSdk = new OnlinePumpAmmSdk(connection);

/**
 * Get the canonical PumpSwap pool address for a token.
 */
export function getCanonicalPoolAddress(mint: PublicKey): PublicKey {
  return canonicalPumpPoolPda(mint);
}

/**
 * Fetch pool account info. Returns null if the pool doesn't exist or isn't initialized.
 */
export async function fetchPoolOrNull(poolAddress: PublicKey) {
  const accountInfo = await connection.getAccountInfo(poolAddress);
  if (!accountInfo || !accountInfo.owner.equals(PUMP_AMM_PROGRAM_ID)) return null;
  try {
    return pumpAmmSdk.decodePoolNullable(accountInfo);
  } catch {
    return null;
  }
}

/**
 * If pool account data is < 300 bytes, returns an extendAccount instruction.
 */
export async function buildExtendPoolIx(
  poolAddress: PublicKey,
  payer: PublicKey
): Promise<TransactionInstruction | null> {
  const accountInfo = await connection.getAccountInfo(poolAddress);
  if (!accountInfo || accountInfo.data.length >= 300) return null;
  return pumpAmmSdk.extendAccount(poolAddress, payer);
}

/**
 * Ensure an associated token account exists. Returns its address.
 */
export async function ensureAta(
  owner: PublicKey,
  mint: PublicKey
): Promise<{ address: PublicKey; createIx: TransactionInstruction | null }> {
  const ata = await getAssociatedTokenAddress(mint, owner);
  const info = await connection.getAccountInfo(ata);
  if (info) return { address: ata, createIx: null };
  const createIx = createAssociatedTokenAccountInstruction(owner, ata, owner, mint);
  return { address: ata, createIx };
}

/**
 * Build instructions to wrap SOL into a WSOL ATA.
 */
export async function buildWrapSolIxs(
  owner: PublicKey,
  lamports: bigint
): Promise<{
  wsolAta: PublicKey;
  setupIxs: TransactionInstruction[];
}> {
  const { address: wsolAta, createIx } = await ensureAta(owner, NATIVE_MINT);
  const setupIxs: TransactionInstruction[] = [];
  if (createIx) setupIxs.push(createIx);

  if (lamports > 0n) {
    setupIxs.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: wsolAta,
        lamports: BigInt(lamports),
      })
    );
    setupIxs.push(createSyncNativeInstruction(wsolAta));
  }

  return { wsolAta, setupIxs };
}

/**
 * Build instruction to close the WSOL ATA (recovers remaining SOL).
 */
export async function buildCloseWsolIx(owner: PublicKey): Promise<TransactionInstruction> {
  const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, owner);
  return createCloseAccountInstruction(wsolAta, owner, owner);
}
