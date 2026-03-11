import { PublicKey, TransactionInstruction, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ANVIL_PROGRAM_ID,
  derivePlatformConfigPda,
  deriveVaultPda,
  deriveVaultPoolPda,
  deriveDistributionPda,
  deriveClaimPda,
} from "../config/anvil";
import { getConnection } from "../config/solana";

// Anchor discriminator: sha256("global:claim")[0..8]
const CLAIM_DISCRIMINATOR = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);

// Anchor discriminator: sha256("global:close_vault")[0..8]
const CLOSE_VAULT_DISCRIMINATOR = Buffer.from([141, 103, 17, 126, 72, 75, 29, 29]);

/**
 * Build a claim instruction for the Anvil Protocol program.
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

/**
 * Build a full claim transaction, serialize it as base64.
 */
export async function buildClaimTx(
  userPubkey: PublicKey,
  mintPubkey: PublicKey,
  cumulativeAmount: bigint,
  proof: string[]
): Promise<string> {
  const ix = buildClaimInstruction(userPubkey, mintPubkey, cumulativeAmount, proof);
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = userPubkey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

/**
 * Build a full close_vault transaction, serialize it as base64.
 */
export async function buildCloseVaultTx(
  creatorPubkey: PublicKey,
  mintPubkey: PublicKey
): Promise<string> {
  const ix = buildCloseVaultInstruction(creatorPubkey, mintPubkey);
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = creatorPubkey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}
