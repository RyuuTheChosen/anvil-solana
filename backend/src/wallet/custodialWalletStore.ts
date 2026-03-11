import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { prisma } from "../db/client";
import { config } from "../config/env";
import { encryptSecretKey, CUSTODIAL_HKDF_INFO, CUSTODIAL_HKDF_SALT } from "../vanity/crypto";
import { getConnection } from "../config/solana";

interface CreateWalletResult {
  publicKey: string;
  isNew: boolean;
}

/**
 * Create a custodial wallet for an X user.
 * Returns existing wallet if one already exists (idempotent).
 */
export async function createCustodialWallet(
  xUserId: string,
  xUsername: string,
): Promise<CreateWalletResult> {
  // Check for existing wallet first
  const existing = await prisma.botWallet.findUnique({
    where: { xUserId },
    select: { publicKey: true },
  });
  if (existing) {
    return { publicKey: existing.publicKey, isNew: false };
  }

  // Generate keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Encrypt with custodial master key (separate from vanity)
  const encryptedKey = encryptSecretKey(
    keypair.secretKey,
    config.custodialMasterKey,
    CUSTODIAL_HKDF_INFO,
    CUSTODIAL_HKDF_SALT,
  );

  // Zero plaintext key immediately
  keypair.secretKey.fill(0);

  await prisma.botWallet.create({
    data: {
      xUserId,
      xUsername,
      publicKey,
      encryptedKey,
    },
  });

  return { publicKey, isNew: true };
}

/**
 * Get a custodial wallet by X user ID.
 */
export async function getCustodialWallet(xUserId: string) {
  return prisma.botWallet.findUnique({
    where: { xUserId },
    select: {
      id: true,
      xUserId: true,
      xUsername: true,
      publicKey: true,
      defaultSplitBps: true,
      defaultMaxHolders: true,
      defaultDevBuySol: true,
      defaultExpiryHours: true,
      createdAt: true,
    },
  });
}

/**
 * Get SOL balance for a wallet.
 */
export async function getCustodialBalance(publicKey: string) {
  const { PublicKey } = await import("@solana/web3.js");
  const connection = getConnection();
  const balanceLamports = await connection.getBalance(new PublicKey(publicKey));
  return {
    publicKey,
    balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    balanceLamports,
  };
}

/**
 * Atomic check-and-increment for daily launch rate limit.
 * Resets counter if lastLaunchDate is not today.
 */
export async function checkAndIncrementLaunchCount(
  xUserId: string,
  maxPerDay: number = config.maxBotLaunchesPerDay,
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wallet = await prisma.botWallet.findUnique({
    where: { xUserId },
    select: { launchesToday: true, lastLaunchDate: true },
  });

  if (!wallet) {
    return { allowed: false, remaining: 0 };
  }

  // Reset if new day
  let currentCount = wallet.launchesToday;
  if (!wallet.lastLaunchDate || wallet.lastLaunchDate < today) {
    currentCount = 0;
  }

  if (currentCount >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }

  // Atomic increment
  await prisma.botWallet.update({
    where: { xUserId },
    data: {
      launchesToday: currentCount + 1,
      lastLaunchDate: new Date(),
    },
  });

  return {
    allowed: true,
    remaining: maxPerDay - (currentCount + 1),
  };
}

/**
 * Update default launch preferences.
 */
export async function updatePreferences(
  xUserId: string,
  prefs: {
    defaultSplitBps?: number;
    defaultMaxHolders?: number;
    defaultDevBuySol?: number;
    defaultExpiryHours?: number;
  },
) {
  const data: Record<string, number> = {};
  if (prefs.defaultSplitBps !== undefined) data.defaultSplitBps = Math.max(0, Math.min(10000, prefs.defaultSplitBps));
  if (prefs.defaultMaxHolders !== undefined) data.defaultMaxHolders = Math.max(100, Math.min(512, prefs.defaultMaxHolders));
  if (prefs.defaultDevBuySol !== undefined) data.defaultDevBuySol = Math.max(0, Math.min(85, prefs.defaultDevBuySol));
  if (prefs.defaultExpiryHours !== undefined) data.defaultExpiryHours = Math.max(6, Math.min(720, prefs.defaultExpiryHours));

  await prisma.botWallet.update({
    where: { xUserId },
    data,
  });
}
