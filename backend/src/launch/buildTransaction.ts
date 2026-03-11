import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  getBuyTokenAmountFromSolAmount,
} from "@pump-fun/pump-sdk";
import BN from "bn.js";
import { getConnection, pumpSdk, getOnlineSdk } from "../config/solana";
import {
  ANVIL_PROGRAM_ID,
  derivePlatformConfigPda,
  deriveVaultPda,
  deriveFeeAccountPda,
  deriveDistributionPda,
} from "../config/anvil";
import { SerializedIx, InstructionSet, serializeIx } from "./serialize";
import { buildFeeSharingIxs, detectFeeSharingState } from "../lib/feeSharingBuilder";

// Re-export for backward compatibility
export { SerializedIx, InstructionSet, serializeIx };

// --- Launch: 1 TX (create token + optional dev buy) ---

export interface BuildLaunchParams {
  creator: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  metadataUri: string;
  devBuySol?: number;
}

export interface BuildLaunchResult {
  instructionSet: InstructionSet;
  mint: string;
  feeAccount: string;
}

export async function buildLaunchInstructions(
  params: BuildLaunchParams
): Promise<BuildLaunchResult> {
  const { mint, creator } = params;
  const [feeAccount] = deriveFeeAccountPda(mint);

  let ixs: TransactionInstruction[];

  if (params.devBuySol && params.devBuySol > 0) {
    const [global, feeConfig] = await Promise.all([
      getOnlineSdk().fetchGlobal(),
      getOnlineSdk().fetchFeeConfig(),
    ]);

    const solAmount = new BN(Math.floor(params.devBuySol * 1e9));
    const tokenAmount = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig,
      mintSupply: null,
      bondingCurve: null,
      amount: solAmount,
    });

    ixs = await pumpSdk.createAndBuyInstructions({
      global,
      mint,
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
      creator,
      user: creator,
      solAmount,
      amount: tokenAmount,
    });
  } else {
    const createIx = await pumpSdk.createInstruction({
      mint,
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
      creator,
      user: creator,
    });
    ixs = [createIx];
  }

  return {
    instructionSet: {
      instructions: ixs.map(serializeIx),
      mintMustSign: true,
    },
    mint: mint.toBase58(),
    feeAccount: feeAccount.toBase58(),
  };
}

// --- Launch: raw instructions (for server-side partial signing with vanity keypair) ---

export interface BuildLaunchRawResult {
  instructions: TransactionInstruction[];
  mint: string;
  feeAccount: string;
}

export async function buildLaunchRawInstructions(
  params: BuildLaunchParams
): Promise<BuildLaunchRawResult> {
  const { mint, creator } = params;
  const [feeAccount] = deriveFeeAccountPda(mint);

  let ixs: TransactionInstruction[];

  if (params.devBuySol && params.devBuySol > 0) {
    const [global, feeConfig] = await Promise.all([
      getOnlineSdk().fetchGlobal(),
      getOnlineSdk().fetchFeeConfig(),
    ]);

    const solAmount = new BN(Math.floor(params.devBuySol * 1e9));
    const tokenAmount = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig,
      mintSupply: null,
      bondingCurve: null,
      amount: solAmount,
    });

    ixs = await pumpSdk.createAndBuyInstructions({
      global,
      mint,
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
      creator,
      user: creator,
      solAmount,
      amount: tokenAmount,
    });
  } else {
    const createIx = await pumpSdk.createInstruction({
      mint,
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
      creator,
      user: creator,
    });
    ixs = [createIx];
  }

  return {
    instructions: ixs,
    mint: mint.toBase58(),
    feeAccount: feeAccount.toBase58(),
  };
}

// --- Configure: 1 TX (fee sharing + create vault) ---

export interface BuildConfigureResult {
  instructionSet: InstructionSet;
  feeAccount: string;
}

export async function buildConfigureInstructions(params: {
  creator: PublicKey;
  mint: PublicKey;
}): Promise<BuildConfigureResult> {
  const { creator, mint } = params;
  const connection = getConnection();
  const [feeAccount] = deriveFeeAccountPda(mint);

  const state = await detectFeeSharingState(connection, mint);
  const feeSharingIxs = await buildFeeSharingIxs(connection, creator, mint, state);

  const createVaultIx = buildCreateVaultIx(creator, mint);

  return {
    instructionSet: {
      instructions: [...feeSharingIxs, createVaultIx].map(serializeIx),
      mintMustSign: false,
    },
    feeAccount: feeAccount.toBase58(),
  };
}

export function buildCreateVaultIx(
  creator: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  const [platformConfig] = derivePlatformConfigPda();
  const [vaultPda] = deriveVaultPda(mint);
  const [distributionPda] = deriveDistributionPda(mint);

  const discriminator = Buffer.from([29, 237, 247, 208, 193, 82, 54, 135]);

  const keys = [
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: platformConfig, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: distributionPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: ANVIL_PROGRAM_ID,
    keys,
    data: discriminator,
  });
}
