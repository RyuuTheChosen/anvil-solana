import { PublicKey } from "@solana/web3.js";
import { feeSharingConfigPda } from "@pump-fun/pump-sdk";
import { connection } from "../config";
import { deriveVaultPda } from "../utils/anchor";
import { prisma } from "../db/client";

/**
 * Check unconfirmed vaults (active but missing vaultCreated or feeSharingConfirmed)
 * and verify their on-chain state. Updates DB flags if accounts exist.
 * Runs once per cycle on the full set (not batched).
 */
export async function confirmUnconfirmedVaults(): Promise<number> {
  const unconfirmed = await prisma.vault.findMany({
    where: {
      active: true,
      OR: [{ vaultCreated: false }, { feeSharingConfirmed: false }],
    },
    select: { id: true, tokenMint: true, vaultCreated: true, feeSharingConfirmed: true },
  });

  if (unconfirmed.length === 0) return 0;

  let confirmed = 0;

  for (const vault of unconfirmed) {
    try {
      const mint = new PublicKey(vault.tokenMint);
      const updates: Record<string, any> = {};

      if (!vault.vaultCreated) {
        const [vaultPda] = deriveVaultPda(mint);
        const vaultInfo = await connection.getAccountInfo(vaultPda);
        if (vaultInfo) updates.vaultCreated = true;
      }

      if (!vault.feeSharingConfirmed) {
        const sharingKey = feeSharingConfigPda(mint);
        const sharingInfo = await connection.getAccountInfo(sharingKey);
        if (sharingInfo) {
          updates.feeSharingConfirmed = true;
          updates.confirmedAt = new Date();
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.vault.update({ where: { id: vault.id }, data: updates });
        confirmed++;
        console.log(`[confirm] Auto-confirmed ${vault.tokenMint}: ${Object.keys(updates).join(", ")}`);
      }
    } catch (err) {
      console.error(`[confirm] Error checking ${vault.tokenMint}:`, err);
    }
  }

  return confirmed;
}
