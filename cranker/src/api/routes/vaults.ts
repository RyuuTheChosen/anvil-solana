import { Router } from "express";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client";
import { connection } from "../../config";
import {
  deriveFeeAccountPda,
  deriveVaultPoolPda,
  deriveVaultPda,
} from "../../utils/anchor";
import { trackHoldersForVault } from "../../services/holderTracker";
import { backfillHoldingTimes } from "../../services/holdingBackfill";
import { validateHolderSplitBps } from "../../utils/splits";

const router = Router();

const REGISTER_API_KEY = process.env.REGISTER_API_KEY || "";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/**
 * POST /api/vaults/register
 * Register a new vault for cranker monitoring.
 * Requires Authorization header when REGISTER_API_KEY is set.
 * Validates the mint is a real SPL token and vault PDA exists on-chain.
 */
router.post("/register", async (req, res) => {
  try {
    // Auth check — fail closed: reject if key is unset or doesn't match
    const auth = req.headers.authorization;
    if (!REGISTER_API_KEY || auth !== `Bearer ${REGISTER_API_KEY}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { tokenMint, creator, name, symbol, metadataUri, imageUrl, maxHolders: rawMaxHolders, holderSplitBps, claimExpiryHours: rawExpiryHours, distributionMode: rawDistMode } = req.body;
    if (!tokenMint || !creator) {
      res.status(400).json({ error: "tokenMint and creator are required" });
      return;
    }

    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(tokenMint);
    } catch {
      res.status(400).json({ error: "Invalid tokenMint pubkey" });
      return;
    }

    // --- On-chain validation: verify mint is a real SPL token ---
    const mintAccount = await connection.getAccountInfo(mintPubkey);
    if (!mintAccount) {
      res.status(400).json({ error: "Mint account does not exist on-chain" });
      return;
    }
    const mintOwner = mintAccount.owner.toBase58();
    if (mintOwner !== TOKEN_PROGRAM_ID.toBase58() && mintOwner !== TOKEN_2022_PROGRAM_ID.toBase58()) {
      res.status(400).json({
        error: "Address is not a valid SPL token mint",
        owner: mintOwner,
      });
      return;
    }

    // --- On-chain validation: verify vault PDA exists ---
    const [vaultPda] = deriveVaultPda(mintPubkey);
    const vaultAccount = await connection.getAccountInfo(vaultPda);
    if (!vaultAccount) {
      res.status(400).json({ error: "Vault PDA does not exist on-chain for this mint" });
      return;
    }

    const [feeAccount] = deriveFeeAccountPda(mintPubkey);
    const [vaultPool] = deriveVaultPoolPda(mintPubkey);

    const parsedSplitBps = holderSplitBps != null ? parseInt(String(holderSplitBps), 10) : undefined;
    const validSplitBps = parsedSplitBps != null && validateHolderSplitBps(parsedSplitBps)
      ? parsedSplitBps : undefined;

    const parsedMaxHolders = rawMaxHolders != null ? parseInt(String(rawMaxHolders), 10) : undefined;
    const validMaxHolders = parsedMaxHolders != null
      && Number.isInteger(parsedMaxHolders) && parsedMaxHolders >= 100 && parsedMaxHolders <= 512
      ? parsedMaxHolders : undefined;

    const parsedExpiryHours = rawExpiryHours != null ? parseInt(String(rawExpiryHours), 10) : undefined;
    const validExpiryHours = parsedExpiryHours != null
      && Number.isInteger(parsedExpiryHours) && parsedExpiryHours >= 6 && parsedExpiryHours <= 720
      ? parsedExpiryHours : undefined;

    const validDistMode = rawDistMode === "pull" ? "pull" : "push"; // default push

    const metadata = {
      ...(name ? { name: String(name).slice(0, 32) } : {}),
      ...(symbol ? { symbol: String(symbol).slice(0, 10) } : {}),
      ...(metadataUri ? { metadataUri: String(metadataUri).slice(0, 512) } : {}),
      ...(imageUrl && /^https:\/\//.test(String(imageUrl)) ? { imageUrl: String(imageUrl).slice(0, 512) } : {}),
      ...(validMaxHolders != null ? { maxHolders: validMaxHolders } : {}),
      ...(validSplitBps != null ? { holderSplitBps: validSplitBps } : {}),
      ...(validExpiryHours != null ? { claimExpiryHours: validExpiryHours } : {}),
      distributionMode: validDistMode,
    };

    const vault = await prisma.vault.upsert({
      where: { tokenMint },
      create: {
        tokenMint,
        creator,
        feeAccount: feeAccount.toBase58(),
        vaultPool: vaultPool.toBase58(),
        feeSharingConfirmed: true,
        vaultCreated: true,
        active: true,
        ...metadata,
      },
      update: {
        creator,
        feeAccount: feeAccount.toBase58(),
        vaultPool: vaultPool.toBase58(),
        active: true,
        ...metadata,
      },
    });

    console.log(`[vaults] Registered vault: mint=${tokenMint}`);
    res.json({ success: true, vaultId: vault.id, tokenMint: vault.tokenMint });

    // Fire-and-forget: track holders then backfill holding times
    trackHoldersForVault(vault)
      .then(() => backfillHoldingTimes(vault.id, tokenMint))
      .catch((err) => console.error(`[vaults] Backfill error for ${tokenMint}:`, err));
  } catch (err) {
    console.error("[api] /vaults/register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/vaults/explore
 * Returns all active vaults with holder count, total distributed, and pool balance.
 */
router.get("/explore", async (_req, res) => {
  try {
    const vaults = await prisma.vault.findMany({
      where: { active: true },
      include: {
        _count: { select: { holders: true } },
        distributions: {
          orderBy: { epochNumber: "desc" },
          take: 1,
          select: {
            totalAllocated: true,
            epochNumber: true,
            holderCount: true,
            createdAt: true,
          },
        },
      },
    });

    const result = vaults.map((v: any) => {
      const latestDist = v.distributions[0];
      return {
        mint: v.tokenMint,
        name: v.name || null,
        symbol: v.symbol || null,
        imageUrl: v.imageUrl || null,
        creator: v.creator,
        feeAccount: v.feeAccount,
        holderCount: latestDist?.holderCount ?? v._count.holders,
        maxHolders: v.maxHolders,
        totalDistributed: latestDist?.totalAllocated?.toString() ?? "0",
        epochCount: latestDist?.epochNumber ?? 0,
        lastDistributionAt: latestDist?.createdAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
      };
    });

    res.json({ vaults: result });
  } catch (err) {
    console.error("[api] /vaults/explore error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
