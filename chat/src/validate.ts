import { PublicKey } from "@solana/web3.js";

/** Parse a base58 string into a PublicKey, or null if invalid. */
export function parsePubkey(input: string): PublicKey | null {
  try {
    return new PublicKey(input);
  } catch {
    return null;
  }
}
