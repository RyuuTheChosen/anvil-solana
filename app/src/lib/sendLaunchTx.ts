import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { findUnknownPrograms } from "./knownPrograms";

export interface SerializedIx {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}

export interface InstructionSet {
  instructions: SerializedIx[];
  mintMustSign: boolean;
}

function deserializeIx(raw: SerializedIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.keys.map(k => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

export interface UnknownProgramWarning {
  programIds: string[];
}

export interface BuiltInstructionSetTx {
  tx: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
  unknownPrograms: UnknownProgramWarning | null;
}

export async function buildInstructionSetTransaction(
  connection: Connection,
  instructionSet: InstructionSet,
  walletPubkey: PublicKey,
  mintKeypair: Keypair | null,
): Promise<BuiltInstructionSetTx> {
  const ixs = instructionSet.instructions.map(deserializeIx);

  const programIds = ixs.map((ix) => ix.programId);
  const unknown = findUnknownPrograms(programIds);
  const unknownPrograms = unknown.length > 0
    ? { programIds: unknown.map((u) => u.id) }
    : null;

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.add(...ixs);
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = walletPubkey;

  if (instructionSet.mintMustSign && mintKeypair) {
    tx.partialSign(mintKeypair);
  }

  return { tx, blockhash, lastValidBlockHeight, unknownPrograms };
}
