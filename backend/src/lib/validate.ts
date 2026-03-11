import { PublicKey, Connection } from "@solana/web3.js";

/** Parse a base58 string into a PublicKey, or null if invalid. */
export function parsePubkey(input: string): PublicKey | null {
  try {
    return new PublicKey(input);
  } catch {
    return null;
  }
}

const MAX_DEV_BUY_SOL = 85;

/** Parse and validate devBuySol: finite, 0..85 SOL. Returns undefined=absent, null=invalid, number=valid. */
export function parseDevBuySol(val: unknown): number | null | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0 || n > MAX_DEV_BUY_SOL) return null;
  return n;
}

/**
 * Verify a confirmed TX references the expected mint.
 * Checks the transaction's account keys list for the mint pubkey.
 */
export async function verifyTxReferencesMint(
  connection: Connection,
  signature: string,
  mint: PublicKey
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return false;
  if (tx.meta?.err) return false;

  const mintStr = mint.toBase58();
  const accountKeys = tx.transaction.message.getAccountKeys();
  for (let i = 0; i < accountKeys.length; i++) {
    if (accountKeys.get(i)?.toBase58() === mintStr) return true;
  }
  return false;
}
