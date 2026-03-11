import { PublicKey, TransactionInstruction, Connection } from "@solana/web3.js";
import {
  feeSharingConfigPda,
  getPumpFeeProgram,
  bondingCurvePda,
  canonicalPumpPoolPda,
} from "@pump-fun/pump-sdk";
import { pumpSdk, getOnlineSdk } from "../config/solana";
import { deriveFeeAccountPda } from "../config/anvil";

export type FeeSharingStatus =
  | "will_configure"       // No config exists — create + set + revoke
  | "will_update"          // Config exists, authority active, wrong shareholder — update + revoke
  | "already_ours"         // Config exists, shareholder is already our fee PDA
  | "revoked_correct"      // Config exists, revoked, shareholder IS our fee PDA
  | "revoked_wrong_target" // Config exists, revoked, shareholder is NOT our fee PDA — DEAD END
  ;

export interface FeeSharingState {
  status: FeeSharingStatus;
  configExists: boolean;
  adminRevoked: boolean;
  currentShareholders: { address: PublicKey; shareBps: number }[];
  feeAccountPda: PublicKey;
  isGraduated: boolean;
  poolAddress: PublicKey | null;
}

/**
 * Detect the current fee sharing state for a PumpFun token.
 */
export async function detectFeeSharingState(
  connection: Connection,
  mint: PublicKey
): Promise<FeeSharingState> {
  const configPda = feeSharingConfigPda(mint);
  const [feeAccountPda] = deriveFeeAccountPda(mint);

  // Check config + graduation in parallel
  const poolPda = canonicalPumpPoolPda(mint);
  const [configInfo, poolInfo] = await Promise.all([
    connection.getAccountInfo(configPda),
    connection.getAccountInfo(poolPda),
  ]);

  const isGraduated = poolInfo !== null;
  const poolAddress = isGraduated ? poolPda : null;

  if (!configInfo) {
    return {
      status: "will_configure",
      configExists: false,
      adminRevoked: false,
      currentShareholders: [],
      feeAccountPda,
      isGraduated,
      poolAddress,
    };
  }

  // Decode the sharing config using pump-sdk
  const decoded = pumpSdk.decodeSharingConfig(configInfo);
  const adminRevoked: boolean = decoded.adminRevoked;
  const shareholders: { address: PublicKey; shareBps: number }[] =
    decoded.shareholders.map((s: { address: PublicKey; shareBps: number }) => ({
      address: s.address,
      shareBps: s.shareBps,
    }));

  // Check if our fee PDA is already the sole shareholder at 100%
  const isOurs =
    shareholders.length === 1 &&
    shareholders[0].address.equals(feeAccountPda) &&
    shareholders[0].shareBps === 10_000;

  let status: FeeSharingStatus;
  if (isOurs) {
    status = adminRevoked ? "revoked_correct" : "already_ours";
  } else if (adminRevoked) {
    status = "revoked_wrong_target";
  } else {
    status = "will_update";
  }

  return {
    status,
    configExists: true,
    adminRevoked,
    currentShareholders: shareholders,
    feeAccountPda,
    isGraduated,
    poolAddress,
  };
}

/**
 * Build the fee sharing instructions needed based on the detected state.
 * Returns empty array if no fee sharing changes are needed.
 */
export async function buildFeeSharingIxs(
  connection: Connection,
  creator: PublicKey,
  mint: PublicKey,
  state: FeeSharingState
): Promise<TransactionInstruction[]> {
  const feeProgram = getPumpFeeProgram(connection);
  const ixs: TransactionInstruction[] = [];

  if (state.status === "will_configure") {
    // Create config + update shares + revoke
    const [createIx, updateIx, revokeIx] = await Promise.all([
      pumpSdk.createFeeSharingConfig({
        creator,
        mint,
        pool: state.poolAddress,
      }),
      pumpSdk.updateFeeShares({
        authority: creator,
        mint,
        currentShareholders: [creator],
        newShareholders: [{ address: state.feeAccountPda, shareBps: 10_000 }],
      }),
      feeProgram.methods
        .revokeFeeSharingAuthority()
        .accountsPartial({ authority: creator, mint })
        .instruction(),
    ]);
    ixs.push(createIx, updateIx, revokeIx);
  } else if (state.status === "will_update") {
    // Update shares + revoke (config already exists)
    const currentAddresses = state.currentShareholders.map((s) => s.address);
    const [updateIx, revokeIx] = await Promise.all([
      pumpSdk.updateFeeShares({
        authority: creator,
        mint,
        currentShareholders: currentAddresses,
        newShareholders: [{ address: state.feeAccountPda, shareBps: 10_000 }],
      }),
      feeProgram.methods
        .revokeFeeSharingAuthority()
        .accountsPartial({ authority: creator, mint })
        .instruction(),
    ]);
    ixs.push(updateIx, revokeIx);
  }
  // "already_ours", "revoked_correct", "revoked_wrong_target" → no fee sharing IXs

  return ixs;
}
