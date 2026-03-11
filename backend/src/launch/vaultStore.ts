import { prisma } from "../db/client";
import type { Vault } from "@prisma/client";

export type VaultRecord = Vault;

export async function storeVault(record: {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  metadataUri: string;
  imageUrl?: string;
  feeAccount?: string;
  vaultPool?: string;
  feeSharingConfirmed?: boolean;
  vaultCreated?: boolean;
  bondingCurve?: string;
  maxHolders?: number;
  holderSplitBps?: number;
  platformFeeBps?: number;
  claimExpiryHours?: number;
}): Promise<VaultRecord> {
  return prisma.vault.create({
    data: {
      tokenMint: record.mint,
      creator: record.creator,
      name: record.name,
      symbol: record.symbol,
      metadataUri: record.metadataUri,
      imageUrl: record.imageUrl ?? null,
      bondingCurve: record.bondingCurve ?? null,
      feeAccount: record.feeAccount ?? "",
      vaultPool: record.vaultPool ?? "",
      feeSharingConfirmed: record.feeSharingConfirmed ?? false,
      vaultCreated: record.vaultCreated ?? false,
      ...(record.maxHolders != null ? { maxHolders: record.maxHolders } : {}),
      ...(record.holderSplitBps != null ? { holderSplitBps: record.holderSplitBps } : {}),
      ...(record.platformFeeBps != null ? { platformFeeBps: record.platformFeeBps } : {}),
      ...(record.claimExpiryHours != null ? { claimExpiryHours: record.claimExpiryHours } : {}),
    },
  });
}

export async function getVault(mint: string): Promise<VaultRecord | null> {
  return prisma.vault.findUnique({ where: { tokenMint: mint } });
}

export async function confirmVault(mint: string): Promise<VaultRecord> {
  return prisma.vault.update({
    where: { tokenMint: mint },
    data: { feeSharingConfirmed: true, confirmedAt: new Date() },
  });
}

export async function markVaultCreated(mint: string): Promise<VaultRecord> {
  return prisma.vault.update({
    where: { tokenMint: mint },
    data: { vaultCreated: true },
  });
}

export const MAX_RETRIES = 10;

export async function incrementRetry(mint: string): Promise<VaultRecord> {
  const record = await prisma.vault.findUnique({ where: { tokenMint: mint } });
  if (!record) throw new Error(`Vault not found: ${mint}`);
  if (record.retryCount >= MAX_RETRIES) {
    throw new Error("Max retries exceeded");
  }
  return prisma.vault.update({
    where: { tokenMint: mint },
    data: { retryCount: { increment: 1 }, lastRetryAt: new Date() },
  });
}

