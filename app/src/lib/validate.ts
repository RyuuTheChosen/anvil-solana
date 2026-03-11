import { PublicKey } from "@solana/web3.js";

/**
 * Returns true if the string is a valid Solana base58 public key.
 */
export function isValidBase58(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}
