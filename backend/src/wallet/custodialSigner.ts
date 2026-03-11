import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  SystemInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { prisma } from "../db/client";
import { config } from "../config/env";
import { decryptSecretKey, CUSTODIAL_HKDF_INFO, CUSTODIAL_HKDF_SALT } from "../vanity/crypto";
import { getConnection } from "../config/solana";

// ─── Allowed Programs ───────────────────────────────────────────────────────

const ALLOWED_PROGRAMS = new Set([
  "11111111111111111111111111111111",           // System Program
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token Program
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // PumpFun
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",  // PumpFun Fee Sharing
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",   // PumpSwap AMM
  "6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs",  // Anvil Program
  "ComputeBudget111111111111111111111111111111",     // Compute Budget
]);

// System Program instruction discriminators (first 4 bytes as u32 LE)
const SYS_CREATE_ACCOUNT = 0;
const SYS_ASSIGN = 1;
const SYS_TRANSFER = 2;

// SPL Token instruction discriminators (first byte)
const TOKEN_INIT_MINT = 0;
const TOKEN_INIT_ACCOUNT = 1;
const TOKEN_TRANSFER = 3;
const TOKEN_APPROVE = 4;
const TOKEN_SET_AUTHORITY = 6;
const TOKEN_MINT_TO = 7;
const TOKEN_CLOSE_ACCOUNT = 9;

const MAX_INSTRUCTIONS = 10;
const MAX_SERIALIZED_SIZE = 2000; // base64 chars

// ─── Transaction Validation ──────────────────────────────────────────────────

/**
 * Deep-validate a transaction before signing with custodial wallet keys.
 * 4 levels: program IDs → System discriminators → Token discriminators → TX-level.
 * Throws on any violation — keys are never touched if this fails.
 */
export function validateTransaction(tx: Transaction, expectedFeePayer: PublicKey): void {
  const instructions = tx.instructions;

  // Level D: Transaction-level validation
  if (instructions.length > MAX_INSTRUCTIONS) {
    throw new SecurityError(`Too many instructions: ${instructions.length} (max ${MAX_INSTRUCTIONS})`);
  }

  if (tx.feePayer && !tx.feePayer.equals(expectedFeePayer)) {
    throw new SecurityError(
      `Fee payer mismatch: expected ${expectedFeePayer.toBase58()}, got ${tx.feePayer.toBase58()}`
    );
  }

  for (const ix of instructions) {
    const programId = ix.programId.toBase58();

    // Level A: Program ID allowlist
    if (!ALLOWED_PROGRAMS.has(programId)) {
      throw new SecurityError(`Blocked program: ${programId}`);
    }

    // Level B: System Program discriminator validation
    if (programId === SystemProgram.programId.toBase58()) {
      validateSystemInstruction(ix.data);
    }

    // Level C: Token Program discriminator validation
    if (programId === TOKEN_PROGRAM_ID.toBase58()) {
      validateTokenInstruction(ix.data);
    }
  }
}

function validateSystemInstruction(data: Buffer): void {
  if (data.length < 4) {
    throw new SecurityError("System instruction data too short");
  }

  const discriminator = data.readUInt32LE(0);

  if (discriminator === SYS_TRANSFER) {
    throw new SecurityError("Blocked: System Program Transfer");
  }
  if (discriminator === SYS_ASSIGN) {
    throw new SecurityError("Blocked: System Program Assign");
  }

  if (discriminator === SYS_CREATE_ACCOUNT) {
    // Validate that the owner (bytes 36-68) is an allowed program
    if (data.length >= 68) {
      const ownerBytes = data.subarray(36, 68);
      const owner = new PublicKey(ownerBytes).toBase58();
      if (!ALLOWED_PROGRAMS.has(owner)) {
        throw new SecurityError(`Blocked: CreateAccount with disallowed owner ${owner}`);
      }
    }
  }
}

function validateTokenInstruction(data: Buffer): void {
  if (data.length < 1) {
    throw new SecurityError("Token instruction data empty");
  }

  const discriminator = data[0];

  if (discriminator === TOKEN_APPROVE) {
    throw new SecurityError("Blocked: Token Approve (delegate attack vector)");
  }
  if (discriminator === TOKEN_SET_AUTHORITY) {
    throw new SecurityError("Blocked: Token SetAuthority (ownership theft vector)");
  }
  if (discriminator === TOKEN_CLOSE_ACCOUNT) {
    throw new SecurityError("Blocked: Token CloseAccount (rent drain vector)");
  }
}

// ─── Instruction Set Types ───────────────────────────────────────────────────

interface SerializedIx {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string; // base64
}

interface InstructionSet {
  instructions: SerializedIx[];
  mintMustSign: boolean;
}

// ─── Sign and Submit ─────────────────────────────────────────────────────────

interface SignAndSubmitOptions {
  xUserId: string;
  serializedTx?: string;       // Base64-encoded partially-signed TX (vanity path)
  instructionSet?: unknown;    // Serialized instructions (configure path)
  mintSecretKey?: string;      // Encrypted fallback mint key
}

/**
 * Validate, sign, and submit a transaction using a custodial wallet.
 * Keys are decrypted only after validation passes, and zeroed in all paths.
 */
export async function signAndSubmitCustodial(opts: SignAndSubmitOptions): Promise<string> {
  const { xUserId, serializedTx, instructionSet } = opts;

  // Lookup wallet
  const wallet = await prisma.botWallet.findUnique({
    where: { xUserId },
    select: { publicKey: true, encryptedKey: true, keyVersion: true },
  });
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  // Build Transaction from either serializedTx or instructionSet
  let tx: Transaction;
  const feePayer = new PublicKey(wallet.publicKey);

  if (serializedTx) {
    // Vanity path: partially-signed TX from build-tx
    if (serializedTx.length > MAX_SERIALIZED_SIZE) {
      throw new SecurityError(`Serialized TX too large: ${serializedTx.length} chars (max ${MAX_SERIALIZED_SIZE})`);
    }
    const txBuffer = Buffer.from(serializedTx, "base64");
    tx = Transaction.from(txBuffer);
  } else if (instructionSet) {
    // Configure path: build TX from instruction set
    const ixSet = instructionSet as InstructionSet;
    if (!ixSet.instructions?.length) {
      throw new Error("Empty instruction set");
    }
    const connection = getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx = new Transaction();
    for (const raw of ixSet.instructions) {
      tx.add(new TransactionInstruction({
        programId: new PublicKey(raw.programId),
        keys: raw.keys.map(k => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(raw.data, "base64"),
      }));
    }
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = feePayer;
  } else {
    throw new Error("serializedTx or instructionSet is required");
  }

  // Validate before touching any keys
  validateTransaction(tx, feePayer);

  // Decrypt key material
  let secretKeyBytes: Uint8Array | null = null;
  let keypair: Keypair | null = null;

  try {
    secretKeyBytes = decryptSecretKey(
      wallet.encryptedKey,
      config.custodialMasterKey,
      CUSTODIAL_HKDF_INFO,
      CUSTODIAL_HKDF_SALT,
    );
    keypair = Keypair.fromSecretKey(secretKeyBytes);

    // Verify the decrypted key matches the wallet's public key
    if (keypair.publicKey.toBase58() !== wallet.publicKey) {
      throw new Error("Key mismatch after decryption");
    }

    // Sign
    tx.partialSign(keypair);

    // Submit
    const connection = getConnection();
    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Confirm
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed",
    );

    // Audit log
    console.log(`[custodial-sign] wallet=${wallet.publicKey.slice(0, 8)}... tx=${signature.slice(0, 16)}... ixCount=${tx.instructions.length}`);

    return signature;
  } finally {
    // Zero ALL key material in every path
    if (secretKeyBytes) secretKeyBytes.fill(0);
    if (keypair) keypair.secretKey.fill(0);
  }
}

// ─── Security Error ──────────────────────────────────────────────────────────

class SecurityError extends Error {
  constructor(message: string) {
    super(`[SECURITY] ${message}`);
    this.name = "SecurityError";
    console.error(`[SECURITY] Blocked custodial TX: ${message}`);
  }
}

export { SecurityError };
