import { TransactionInstruction } from "@solana/web3.js";

export interface SerializedIx {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}

export interface InstructionSet {
  instructions: SerializedIx[];
  mintMustSign: boolean;
}

export function serializeIx(ix: TransactionInstruction): SerializedIx {
  return {
    programId: ix.programId.toBase58(),
    keys: ix.keys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(ix.data).toString("base64"),
  };
}
