import {
  PublicKey,
  Connection,
  TransactionInstruction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";

const ANVIL_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_ANVIL_PROGRAM_ID || "6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs"
);

const PLATFORM_SEED = Buffer.from("anvil");
const PLATFORM_CONFIG_SEED = Buffer.from("platform");
const TREASURY_SEED = Buffer.from("treasury");

export function derivePlatformConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, PLATFORM_CONFIG_SEED],
    ANVIL_PROGRAM_ID
  );
}

export function deriveTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, TREASURY_SEED],
    ANVIL_PROGRAM_ID
  );
}

export interface PlatformConfigData {
  authority: string;
  crankerAuthority: string;
  crankerAuthority2: string;
  platformTreasury: string;
  platformFeeBps: number;
  vaultCount: number;
  paused: boolean;
  bump: number;
}

export function parsePlatformConfig(data: Buffer): PlatformConfigData {
  // Skip 8-byte Anchor discriminator
  const offset = 8;
  return {
    authority: new PublicKey(data.subarray(offset, offset + 32)).toBase58(),
    crankerAuthority: new PublicKey(data.subarray(offset + 32, offset + 64)).toBase58(),
    crankerAuthority2: new PublicKey(data.subarray(offset + 64, offset + 96)).toBase58(),
    platformTreasury: new PublicKey(data.subarray(offset + 96, offset + 128)).toBase58(),
    platformFeeBps: data.readUInt16LE(offset + 128),
    vaultCount: data.readUInt32LE(offset + 130),
    paused: data[offset + 134] === 1,
    bump: data[offset + 135],
  };
}

export async function fetchPlatformConfig(
  connection: Connection
): Promise<PlatformConfigData | null> {
  const [pda] = derivePlatformConfigPda();
  const info = await connection.getAccountInfo(pda);
  if (!info || !info.data) return null;
  return parsePlatformConfig(Buffer.from(info.data));
}

// Discriminators from IDL
const WITHDRAW_TREASURY_DISC = Buffer.from([40, 63, 122, 158, 144, 216, 83, 96]);
const UPDATE_PLATFORM_DISC = Buffer.from([46, 78, 138, 189, 47, 163, 120, 85]);

export function buildWithdrawTreasuryIx(
  authority: PublicKey,
  destination: PublicKey,
  amount: bigint
): TransactionInstruction {
  const [platformConfig] = derivePlatformConfigPda();
  const [platformTreasury] = deriveTreasuryPda();

  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);

  const data = Buffer.concat([WITHDRAW_TREASURY_DISC, amountBuf]);

  return new TransactionInstruction({
    programId: ANVIL_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: platformTreasury, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function serializeOptionPubkey(value: PublicKey | null): Buffer {
  if (!value) return Buffer.from([0x00]);
  return Buffer.concat([Buffer.from([0x01]), value.toBuffer()]);
}

function serializeOptionU16(value: number | null): Buffer {
  if (value === null) return Buffer.from([0x00]);
  const buf = Buffer.alloc(3);
  buf[0] = 0x01;
  buf.writeUInt16LE(value, 1);
  return buf;
}

function serializeOptionBool(value: boolean | null): Buffer {
  if (value === null) return Buffer.from([0x00]);
  return Buffer.from([0x01, value ? 1 : 0]);
}

export function buildUpdatePlatformIx(
  authority: PublicKey,
  params: {
    crankerAuthority?: PublicKey | null;
    crankerAuthority2?: PublicKey | null;
    platformFeeBps?: number | null;
    paused?: boolean | null;
  }
): TransactionInstruction {
  const [platformConfig] = derivePlatformConfigPda();

  const data = Buffer.concat([
    UPDATE_PLATFORM_DISC,
    serializeOptionPubkey(params.crankerAuthority ?? null),
    serializeOptionPubkey(params.crankerAuthority2 ?? null),
    serializeOptionU16(params.platformFeeBps ?? null),
    serializeOptionBool(params.paused ?? null),
  ]);

  return new TransactionInstruction({
    programId: ANVIL_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: platformConfig, isSigner: false, isWritable: true },
    ],
    data,
  });
}

export async function submitAdminTransaction(
  connection: Connection,
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  ix: TransactionInstruction
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = publicKey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  const signed = await signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  return sig;
}
