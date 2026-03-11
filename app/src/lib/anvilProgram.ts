import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";

const ANVIL_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_ANVIL_PROGRAM_ID || "6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs"
);

// Seeds matching the on-chain constants
const PLATFORM_SEED = Buffer.from("anvil");
const PLATFORM_TAG = Buffer.from("platform");
const VAULT_SEED = Buffer.from("vault");
const FEE_SEED = Buffer.from("fees");
const POOL_SEED = Buffer.from("pool");
const DISTRIBUTION_SEED = Buffer.from("distribution");
const CLAIM_SEED = Buffer.from("claimed");

export function derivePlatformConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, PLATFORM_TAG],
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

// Anchor discriminator: sha256("global:claim")[0..8]
const CLAIM_DISCRIMINATOR = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);

/**
 * Build a claim instruction for the Anvil Protocol program.
 * The user signs this to claim their SOL from the vault pool.
 */
export function buildClaimInstruction(
  user: PublicKey,
  mint: PublicKey,
  cumulativeAmount: bigint,
  proof: string[] // hex-encoded 32-byte hashes
): TransactionInstruction {
  const [platformConfig] = derivePlatformConfigPda();
  const [vaultPda] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);
  const [distributionPda] = deriveDistributionPda(mint);
  const [claimPda] = deriveClaimPda(mint, user);

  // Serialize args: u64 cumulative_amount + Vec<[u8; 32]> proof
  // u64: 8 bytes LE
  // Vec: 4-byte LE length prefix + N * 32 bytes
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(cumulativeAmount);

  const proofBytes = proof.map((h) => Buffer.from(h, "hex"));
  const vecLenBuf = Buffer.alloc(4);
  vecLenBuf.writeUInt32LE(proofBytes.length);

  const data = Buffer.concat([
    CLAIM_DISCRIMINATOR,
    amountBuf,
    vecLenBuf,
    ...proofBytes,
  ]);

  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: platformConfig, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: vaultPool, isSigner: false, isWritable: true },
    { pubkey: distributionPda, isSigner: false, isWritable: false },
    { pubkey: claimPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: ANVIL_PROGRAM_ID,
    keys,
    data,
  });
}

// Anchor discriminator: sha256("global:close_vault")[0..8]
const CLOSE_VAULT_DISCRIMINATOR = Buffer.from([141, 103, 17, 126, 72, 75, 29, 29]);

/**
 * Build a close_vault instruction. The creator signs to close their vault
 * and withdraw any unallocated SOL.
 */
export function buildCloseVaultInstruction(
  creator: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  const [platformConfig] = derivePlatformConfigPda();
  const [vaultPda] = deriveVaultPda(mint);
  const [vaultPool] = deriveVaultPoolPda(mint);

  const keys = [
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: platformConfig, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: vaultPool, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: ANVIL_PROGRAM_ID,
    keys,
    data: CLOSE_VAULT_DISCRIMINATOR,
  });
}

import { apiFetch } from "./api";

/** On-chain params needed to build a claim instruction */
export interface ClaimParams {
  cumulativeAmount: string;
  proof: string[];
}

/** Display/UI fields from the API response */
export interface ClaimInfo {
  alreadyClaimed: string;
  claimable: string;
  epochNumber: number;
  expiresAt: string | null;
  expired: boolean;
}

/** Full API response — composed from tx params + display info */
export type ClaimData = ClaimParams & ClaimInfo;

export interface DistributionData {
  merkleRoot: string | null;
  totalAllocated: string;
  epochCount: number;
  holderCount: number;
  topHolders: { wallet: string; cumulativeAmount: string; balance?: string; score: number }[];
}

export interface UserClaim {
  mint: string;
  cumulativeAmount: string;
  alreadyClaimed: string;
  claimable: string;
}

export async function fetchClaimData(
  mint: string,
  wallet: string
): Promise<ClaimData> {
  const res = await apiFetch(`/api/claims/proof/${mint}/${wallet}`);
  if (!res.ok) throw new Error("Failed to fetch claim data");
  return res.json();
}

export async function fetchDistribution(
  mint: string
): Promise<DistributionData> {
  const res = await apiFetch(`/api/claims/distributions/${mint}`);
  if (!res.ok) throw new Error("Failed to fetch distribution");
  return res.json();
}

export async function fetchUserClaims(
  wallet: string
): Promise<{ claims: UserClaim[] }> {
  const res = await apiFetch(`/api/claims/user/${wallet}`);
  if (!res.ok) throw new Error("Failed to fetch user claims");
  return res.json();
}

export interface CreatedVault {
  tokenMint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  active: boolean;
  vaultCreated: boolean;
  feeSharingConfirmed: boolean;
  holderSplitBps: number;
  closeRequestedAt: string | null;
}

export async function fetchCreatedVaults(
  wallet: string
): Promise<{ vaults: CreatedVault[] }> {
  const res = await apiFetch(`/api/explore/created/${wallet}`);
  if (!res.ok) throw new Error("Failed to fetch created vaults");
  return res.json();
}

export async function confirmCloseVault(
  mint: string,
  txSignature: string
): Promise<void> {
  const res = await apiFetch(`/api/vault/${mint}/confirm-close`, {
    method: "POST",
    body: JSON.stringify({ signature: txSignature }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to confirm close");
  }
}

export interface PushHistoryEntry {
  amount: string;
  txSignature: string | null;
  pushedAt: string;
}

export interface PushHistory {
  distributionMode: string;
  totalReceived: string;
  pushes: PushHistoryEntry[];
}

export async function fetchPushHistory(
  mint: string,
  wallet: string
): Promise<PushHistory> {
  const res = await apiFetch(`/api/claims/history/${mint}/${wallet}`);
  if (!res.ok) throw new Error("Failed to fetch push history");
  return res.json();
}
