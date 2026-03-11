import { Router, Request, Response } from "express";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";
import { uploadMetadata } from "../launch/metadataUploader";
import {
  buildLaunchInstructions,
  buildLaunchRawInstructions,
  buildConfigureInstructions,
} from "../launch/buildTransaction";
import {
  storeVault,
  confirmVault,
  getVault,
  markVaultCreated,
} from "../launch/vaultStore";
import {
  storePendingLaunch,
  getPendingLaunch,
  removePendingLaunch,
} from "../launch/pendingLaunches";
import { feeSharingConfigPda } from "@pump-fun/pump-sdk";
import { getConnection } from "../config/solana";
import { parsePubkey, parseDevBuySol, verifyTxReferencesMint } from "../lib/validate";
import { deriveFeeAccountPda, deriveVaultPda, fetchPlatformFeeBps } from "../config/anvil";
import { registerVaultWithCranker } from "../lib/crankerClient";
import { config } from "../config/env";
import { strictLimit, botLimit } from "../middleware/rateLimits";
import { claimKeypair, markConfirmedOnChain } from "../vanity/keypairPool";

const router = Router();

/** Apply botLimit for bot-authenticated requests, strictLimit for everyone else */
function adaptiveLimit(req: Request, res: Response, next: Function): void {
  if ((req as any).botAuthenticated) {
    botLimit(req, res, next as any);
  } else {
    strictLimit(req, res, next as any);
  }
}

function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10000;
}

/** Validate file magic bytes against known image formats. */
async function isValidImageFile(filePath: string): Promise<boolean> {
  const fd = await fsp.open(filePath, "r");
  try {
    const buf = Buffer.alloc(12);
    await fd.read(buf, 0, 12, 0);

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    // GIF: 47 49 46 38
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
    // WebP: RIFF....WEBP (bytes 8-11)
    if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;

    return false;
  } finally {
    await fd.close();
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  dest: path.resolve(__dirname, "../../uploads/"),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * POST /api/launch/preview
 */
router.post(
  "/preview",
  adaptiveLimit,
  (req: Request, res: Response, next: Function) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
          return;
        }
        res.status(400).json({ error: "File upload failed" });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const cleanup = () => {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    };

    try {
      const { name, symbol, description, twitter, telegram, website } =
        req.body;

      if (!req.file) {
        cleanup();
        res.status(400).json({ error: "Image is required" });
        return;
      }
      if (!await isValidImageFile(req.file.path)) {
        cleanup();
        res.status(400).json({ error: "Invalid image format. Supported: JPEG, PNG, GIF, WebP" });
        return;
      }
      if (!name || !symbol || !description) {
        cleanup();
        res
          .status(400)
          .json({ error: "name, symbol, and description are required" });
        return;
      }

      if (name.length > 32 || symbol.length > 10 || description.length > 500) {
        cleanup();
        res.status(400).json({ error: "name (max 32), symbol (max 10), description (max 500) exceeded" });
        return;
      }
      const socials = [twitter, telegram, website].filter(Boolean);
      if (socials.some((s: string) => s.length > 256)) {
        cleanup();
        res.status(400).json({ error: "Social links must be under 256 characters" });
        return;
      }

      const result = await uploadMetadata(req.file.path, {
        name,
        symbol,
        description,
        twitter,
        telegram,
        website,
      });

      cleanup();
      res.json({ success: true, ...result });
    } catch (err: any) {
      cleanup();
      console.error("[launch/preview] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * POST /api/launch/build-tx
 * If 'mint' is omitted: tries vanity pool → returns partially-signed TX
 * If 'mint' is provided: fallback flow → returns instruction set (existing behavior)
 */
router.post("/build-tx", adaptiveLimit, async (req: Request, res: Response) => {
  try {
    const { creator, mint, name, symbol, metadataUri, devBuySol, imageUrl, holderSplitBps: rawSplitBps, maxHolders: rawMaxHolders, claimExpiryHours: rawExpiryHours } = req.body;

    if (!creator || !name || !symbol || !metadataUri) {
      res.status(400).json({ error: "creator, name, symbol, and metadataUri are required" });
      return;
    }

    // Validate holderSplitBps
    const holderSplitBps = rawSplitBps != null ? parseInt(String(rawSplitBps), 10) : config.defaultHolderSplitBps;
    if (!isValidBps(holderSplitBps)) {
      res.status(400).json({ error: "holderSplitBps must be an integer between 0 and 10000" });
      return;
    }

    // Validate maxHolders (100-512)
    const maxHolders = rawMaxHolders != null ? parseInt(String(rawMaxHolders), 10) : 100;
    if (!Number.isInteger(maxHolders) || maxHolders < 100 || maxHolders > 512) {
      res.status(400).json({ error: "maxHolders must be an integer between 100 and 512" });
      return;
    }

    // Validate claimExpiryHours (6-720)
    const claimExpiryHours = rawExpiryHours != null ? parseInt(String(rawExpiryHours), 10) : undefined;
    if (claimExpiryHours != null && (!Number.isInteger(claimExpiryHours) || claimExpiryHours < 6 || claimExpiryHours > 720)) {
      res.status(400).json({ error: "claimExpiryHours must be an integer between 6 and 720" });
      return;
    }

    let creatorPubkey: PublicKey;
    try {
      creatorPubkey = new PublicKey(creator);
    } catch {
      res.status(400).json({ error: "Invalid creator pubkey" });
      return;
    }

    const parsedDevBuy = parseDevBuySol(devBuySol);
    if (parsedDevBuy === null) {
      res.status(400).json({ error: "Invalid devBuySol (must be 0-85 SOL)" });
      return;
    }

    // Validate imageUrl if provided — only allow https
    const safeImageUrl = imageUrl && /^https:\/\//.test(String(imageUrl))
      ? String(imageUrl).slice(0, 512)
      : undefined;

    // --- Vanity path: mint not provided, try vanity pool ---
    if (!mint) {
      const MAX_VANITY_ATTEMPTS = 3;
      const connection = getConnection();

      for (let attempt = 0; attempt < MAX_VANITY_ATTEMPTS; attempt++) {
        const vanity = await claimKeypair(config.vanitySuffix);

        if (!vanity) {
          // Pool empty — tell frontend to generate its own keypair and retry
          res.json({ success: true, isVanity: false, poolEmpty: true });
          return;
        }

        // Verify mint doesn't already exist on-chain (catches reclaimed-but-used keypairs)
        const existingAccount = await connection.getAccountInfo(new PublicKey(vanity.publicKey));
        if (existingAccount) {
          vanity.secretKey.fill(0);
          console.warn(`[launch/build-tx] Vanity mint ${vanity.publicKey} already exists on-chain, marking consumed and retrying`);
          try { await markConfirmedOnChain(vanity.publicKey); } catch { /* already marked */ }
          continue;
        }

        // Tight scope for secret key material
        let serializedTx: string;
        let mintBase58: string;
        let feeAccount: string;
        try {
          const mintKeypair = Keypair.fromSecretKey(vanity.secretKey);
          const mintPubkey = mintKeypair.publicKey;
          mintBase58 = mintPubkey.toBase58();

          // Build raw instructions for partial signing
          const rawResult = await buildLaunchRawInstructions({
            creator: creatorPubkey,
            mint: mintPubkey,
            name,
            symbol,
            metadataUri,
            devBuySol: parsedDevBuy,
          });
          feeAccount = rawResult.feeAccount;

          // Build and partial-sign transaction
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
          const tx = new Transaction();
          tx.add(...rawResult.instructions);
          tx.recentBlockhash = blockhash;
          tx.lastValidBlockHeight = lastValidBlockHeight;
          tx.feePayer = creatorPubkey;
          tx.partialSign(mintKeypair);

          // IMMEDIATELY zero secret key
          mintKeypair.secretKey.fill(0);
          vanity.secretKey.fill(0);

          serializedTx = tx.serialize({ requireAllSignatures: false }).toString("base64");
        } catch (err) {
          // Zero key material on error too
          vanity.secretKey.fill(0);
          throw err;
        }

        // Store pending launch (vault created on confirm, not here)
        storePendingLaunch({
          mint: mintBase58,
          creator,
          name,
          symbol,
          metadataUri,
          imageUrl: safeImageUrl,
          maxHolders,
          holderSplitBps,
          platformFeeBps: await fetchPlatformFeeBps(),
          claimExpiryHours,
          isVanity: true,
        });

        console.log(`[launch/build-tx] Vanity launch for ${symbol}: mint=${mintBase58} split=${holderSplitBps}bps`);

        res.json({
          success: true,
          isVanity: true,
          mint: mintBase58,
          feeAccount,
          partiallySignedTx: serializedTx,
        });
        return;
      }

      // All vanity attempts had stale mints — fall back to non-vanity
      console.warn(`[launch/build-tx] All ${MAX_VANITY_ATTEMPTS} vanity attempts had on-chain conflicts, falling back`);
      res.json({ success: true, isVanity: false, poolEmpty: true });
      return;
    }

    // --- Fallback path: mint provided by frontend (existing flow) ---
    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mint);
    } catch {
      res.status(400).json({ error: "Invalid mint pubkey" });
      return;
    }

    const result = await buildLaunchInstructions({
      creator: creatorPubkey,
      mint: mintPubkey,
      name,
      symbol,
      metadataUri,
      devBuySol: parsedDevBuy,
    });

    // Store pending launch (vault created on confirm, not here)
    storePendingLaunch({
      mint: result.mint,
      creator,
      name,
      symbol,
      metadataUri,
      imageUrl: safeImageUrl,
      maxHolders,
      holderSplitBps,
      platformFeeBps: await fetchPlatformFeeBps(),
      claimExpiryHours,
      isVanity: false,
    });

    console.log(`[launch/build-tx] Fallback launch for ${symbol}: mint=${result.mint} split=${holderSplitBps}bps`);

    res.json({ success: true, isVanity: false, ...result });
  } catch (err: any) {
    console.error("[launch/build-tx] Error:", err);
    res.status(500).json({ error: "Failed to build launch instructions" });
  }
});

/**
 * POST /api/launch/confirm
 * Confirms token creation on-chain and creates the vault record.
 * Accepts optional metadata fields as fallback (e.g. after server restart
 * when the in-memory pending store was lost).
 */
router.post("/confirm", async (req: Request, res: Response) => {
  try {
    const { mint, signature } = req.body;

    if (!mint || !signature) {
      res.status(400).json({ error: "mint and signature are required" });
      return;
    }

    // Idempotent: if vault already exists, confirm was already processed
    const existingVault = await getVault(mint);
    if (existingVault) {
      console.log(`[launch/confirm] Already confirmed: mint=${mint}`);
      res.json({ success: true, mint, creator: existingVault.creator });
      return;
    }

    // Resolve launch metadata: prefer pending store, fall back to request body
    const pendingLaunch = getPendingLaunch(mint);
    const creator = pendingLaunch?.creator || req.body.creator;
    const name = pendingLaunch?.name || req.body.name;
    const symbol = pendingLaunch?.symbol || req.body.symbol;
    const metadataUri = pendingLaunch?.metadataUri || req.body.metadataUri;

    if (!creator || !name || !symbol || !metadataUri) {
      res.status(400).json({ error: "Launch metadata not found. Please retry the launch." });
      return;
    }

    // Verify TX on-chain BEFORE creating any persistent state
    const connection = getConnection();
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    const confirmationStatus = status.value?.confirmationStatus;
    if (!confirmationStatus || !["confirmed", "finalized"].includes(confirmationStatus)) {
      res.status(400).json({ error: "Transaction not confirmed" });
      return;
    }

    const mintPubkey = parsePubkey(mint);
    if (!mintPubkey) {
      res.status(400).json({ error: "Invalid mint address" });
      return;
    }
    if (!await verifyTxReferencesMint(connection, signature, mintPubkey)) {
      res.status(400).json({ error: "Transaction does not reference the provided mint" });
      return;
    }

    // TX verified on-chain — now create persistent state
    await storeVault({
      mint,
      creator,
      name,
      symbol,
      metadataUri,
      imageUrl: pendingLaunch?.imageUrl || req.body.imageUrl,
      maxHolders: pendingLaunch?.maxHolders ?? (req.body.maxHolders ? parseInt(req.body.maxHolders) : 100),
      holderSplitBps: pendingLaunch?.holderSplitBps ?? (req.body.holderSplitBps ? parseInt(req.body.holderSplitBps) : 5000),
      platformFeeBps: pendingLaunch?.platformFeeBps ?? await fetchPlatformFeeBps(),
      claimExpiryHours: pendingLaunch?.claimExpiryHours ?? (req.body.claimExpiryHours ? parseInt(req.body.claimExpiryHours) : undefined),
    });

    // Mark vanity keypair as permanently consumed (if it was a vanity mint)
    if (pendingLaunch?.isVanity) {
      try {
        await markConfirmedOnChain(mint);
      } catch {
        // Already confirmed — ignore
      }
    }

    // Clean up pending entry
    removePendingLaunch(mint);

    console.log(`[launch/confirm] Token confirmed: mint=${mint}`);

    res.json({ success: true, mint, creator });
  } catch (err: any) {
    console.error("[launch/confirm] Error:", err);
    res.status(500).json({ error: "Confirmation failed" });
  }
});

/**
 * POST /api/launch/build-configure
 * Returns 1 instruction set: fee sharing (3 IXs) + create vault
 * Called after token creation is confirmed on-chain
 */
router.post("/build-configure", async (req: Request, res: Response) => {
  try {
    const { mint, creator } = req.body;

    if (!mint || !creator) {
      res.status(400).json({ error: "mint and creator are required" });
      return;
    }

    let mintPubkey: PublicKey;
    let creatorPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mint);
      creatorPubkey = new PublicKey(creator);
    } catch {
      res.status(400).json({ error: "Invalid mint or creator pubkey" });
      return;
    }

    const vault = await getVault(mint);
    if (!vault) {
      res.status(404).json({ error: "Vault not found for this mint" });
      return;
    }
    if (vault.creator !== creatorPubkey.toBase58()) {
      res.status(403).json({ error: "Wallet doesn't match original creator" });
      return;
    }

    // Check if already configured
    const connection = getConnection();
    const sharingConfigPda = feeSharingConfigPda(mintPubkey);
    const [vaultPda] = deriveVaultPda(mintPubkey);

    const [sharingAccount, vaultAccount] = await Promise.all([
      connection.getAccountInfo(sharingConfigPda),
      connection.getAccountInfo(vaultPda),
    ]);

    if (sharingAccount && vaultAccount) {
      await confirmVault(mint);
      await markVaultCreated(mint);
      res.json({ success: true, alreadyConfigured: true, mint });
      return;
    }

    const result = await buildConfigureInstructions({
      creator: creatorPubkey,
      mint: mintPubkey,
    });

    console.log(`[launch/build-configure] Built configure IX: mint=${mint}`);

    res.json({ success: true, ...result, mint });
  } catch (err: any) {
    console.error("[launch/build-configure] Error:", err);
    res.status(500).json({ error: "Failed to build configure instructions" });
  }
});

/**
 * POST /api/launch/confirm-configure
 * Confirms fee sharing + vault creation on-chain
 */
router.post("/confirm-configure", async (req: Request, res: Response) => {
  try {
    const { mint, signature } = req.body;

    if (!mint || !signature) {
      res.status(400).json({ error: "mint and signature are required" });
      return;
    }

    const vault = await getVault(mint);
    if (!vault) {
      res.status(404).json({ error: "Vault not found for this mint" });
      return;
    }

    const connection = getConnection();
    const mintPubkey = new PublicKey(mint);

    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    const confirmationStatus = status.value?.confirmationStatus;
    if (!confirmationStatus || !["confirmed", "finalized"].includes(confirmationStatus)) {
      res.status(400).json({ error: "Transaction not confirmed" });
      return;
    }

    if (!await verifyTxReferencesMint(connection, signature, mintPubkey)) {
      res.status(400).json({ error: "Transaction does not reference the provided mint" });
      return;
    }

    const sharingConfigPda = feeSharingConfigPda(mintPubkey);
    const [feeAccount] = deriveFeeAccountPda(mintPubkey);
    const [vaultPda] = deriveVaultPda(mintPubkey);

    const [sharingAccount, vaultAccount] = await Promise.all([
      connection.getAccountInfo(sharingConfigPda),
      connection.getAccountInfo(vaultPda),
    ]);

    if (sharingAccount) {
      await confirmVault(mint);
    }
    if (vaultAccount) {
      await markVaultCreated(mint);
      // Register with cranker for monitoring — pass metadata + split config
      registerVaultWithCranker(mint, vault.creator, {
        name: vault.name ?? undefined,
        symbol: vault.symbol ?? undefined,
        metadataUri: vault.metadataUri ?? undefined,
        imageUrl: vault.imageUrl ?? undefined,
        maxHolders: vault.maxHolders,
        holderSplitBps: vault.holderSplitBps,
        claimExpiryHours: vault.claimExpiryHours ?? undefined,
        distributionMode: "push",
      }).catch((err) => {
        console.error(`[launch/confirm-configure] Cranker registration failed:`, err);
      });
    }

    console.log(`[launch/confirm-configure] Confirmed: mint=${mint}, feeSharing=${!!sharingAccount}, vault=${!!vaultAccount}`);

    res.json({
      success: true,
      mint,
      feeAccount: feeAccount.toBase58(),
      feeSharingConfirmed: !!sharingAccount,
      vaultCreated: !!vaultAccount,
    });
  } catch (err: any) {
    console.error("[launch/confirm-configure] Error:", err);
    res.status(500).json({ error: "Confirmation failed" });
  }
});

export default router;
