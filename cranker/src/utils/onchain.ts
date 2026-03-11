import { PublicKey } from "@solana/web3.js";
import { connection } from "../config";
import { deriveClaimPda } from "./anchor";

/**
 * On-chain account data offsets (after 8-byte Anchor discriminator).
 */
export const VAULT_TOTAL_CLAIMED_OFFSET = 8 + 32 + 32 + 8; // disc + creator + mint + total_deposited = 80
export const VAULT_TOTAL_ALLOCATED_OFFSET = 8 + 32 + 32 + 8 + 8; // disc + creator + mint + total_deposited + total_claimed = 88
export const DISTRIBUTION_TOTAL_ALLOCATED_OFFSET = 8 + 32 + 32; // disc + mint + merkle_root = 72
export const CLAIM_CLAIMED_AMOUNT_OFFSET = 8 + 32 + 32; // disc + user + mint = 72

/** Safely read a u64 (8 bytes LE) from a Buffer, returning null if data is too short. */
export function safeReadU64(data: Buffer, offset: number): bigint | null {
  if (data.length < offset + 8) return null;
  return data.readBigUInt64LE(offset);
}

/**
 * Read claimed_amount from on-chain ClaimAccount.
 * Returns 0n if the account doesn't exist yet.
 */
export async function getOnChainClaimed(
  mint: string,
  wallet: string
): Promise<bigint> {
  try {
    const [claimPda] = deriveClaimPda(
      new PublicKey(mint),
      new PublicKey(wallet)
    );
    const accountInfo = await connection.getAccountInfo(claimPda);
    if (accountInfo) {
      const val = safeReadU64(accountInfo.data, CLAIM_CLAIMED_AMOUNT_OFFSET);
      if (val === null) {
        console.warn(`[onchain] ClaimAccount for ${wallet} has unexpected data length: ${accountInfo.data.length}`);
        return 0n;
      }
      return val;
    }
  } catch {
    // ClaimAccount doesn't exist yet
  }
  return 0n;
}
