import { Router, Request, Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { parsePubkey, verifyTxReferencesMint } from "../lib/validate";
import {
  bondingCurvePda,
  feeSharingConfigPda,
} from "@pump-fun/pump-sdk";
import { getConnection, pumpSdk, getOnlineSdk } from "../config/solana";
import { deriveVaultPda, deriveFeeAccountPda, fetchPlatformFeeBps } from "../config/anvil";
import { buildCreateVaultIx } from "../launch/buildTransaction";
import { serializeIx } from "../launch/serialize";
import {
  detectFeeSharingState,
  buildFeeSharingIxs,
  FeeSharingStatus,
} from "../lib/feeSharingBuilder";
import { registerVaultWithCranker } from "../lib/crankerClient";
import { fetchPumpMetadata } from "../lib/pumpMetadata";
import { storeVault, getVault, confirmVault, markVaultCreated } from "../launch/vaultStore";
import { config } from "../config/env";
import { prisma } from "../db/client";
import { strictLimit } from "../middleware/rateLimits";
import { requireAnyAuth, optionalPrivyAuth, resolveXUserId } from "../middleware/privyAuth";
import { getCustodialWallet } from "../wallet/custodialWalletStore";
import { signAndSubmitCustodial, SecurityError } from "../wallet/custodialSigner";
import { buildCloseVaultTx } from "../lib/claimBuilder";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nacl = require("tweetnacl") as { sign: { detached: { verify(msg: Uint8Array, sig: Uint8Array, pk: Uint8Array): boolean } } };

const router = Router();

/** Verify a wallet signature for creator-only actions. Returns the vault on success, or sends error response and returns null. */
async function verifyCreatorSignature(
  req: Request<{ mint: string }>,
  res: Response,
  message: string
): Promise<import("@prisma/client").Vault | null> {
  const { signature, publicKey: signerKey, timestamp } = req.body;

  if (!signature || !signerKey || !timestamp) {
    res.status(400).json({ error: "signature, publicKey, and timestamp are required" });
    return null;
  }

  const ts = parseInt(String(timestamp), 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    res.status(400).json({ error: "Timestamp too old or in the future" });
    return null;
  }

  const vault = await getVault(req.params.mint);
  if (!vault) {
    res.status(404).json({ error: "Vault not found" });
    return null;
  }

  if (signerKey !== vault.creator) {
    res.status(403).json({ error: "Only the vault creator can perform this action" });
    return null;
  }

  const messageBytes = new TextEncoder().encode(message);
  const sigBytes = Buffer.from(signature, "base64");
  const pubkeyBytes = new PublicKey(signerKey).toBytes();

  if (!nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes)) {
    res.status(403).json({ error: "Invalid signature" });
    return null;
  }

  return vault;
}

/**
 * Verify vault creator via custodial wallet (JWT-verified identity).
 * Returns the vault if the authenticated user's custodial wallet is the vault creator.
 * Returns null (without sending response) if no JWT auth — caller should fall back to signature path.
 */
async function verifyCustodialCreator(
  req: Request<{ mint: string }>,
  res: Response
): Promise<import("@prisma/client").Vault | null> {
  const xUserId = (req as any).privyUser?.xUserId;
  if (!xUserId) return null; // No JWT auth — fall through to signature path

  const wallet = await getCustodialWallet(xUserId);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return null;
  }

  const vault = await getVault(req.params.mint);
  if (!vault) {
    res.status(404).json({ error: "Vault not found" });
    return null;
  }

  if (wallet.publicKey !== vault.creator) {
    res.status(403).json({ error: "Only the vault creator can perform this action" });
    return null;
  }

  return vault;
}

function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10000;
}

/**
 * POST /api/vault/build-create
 *
 * Validates the mint, detects fee sharing state, and returns
 * the appropriate instructions for a single transaction.
 */
router.post("/build-create", strictLimit, async (req: Request, res: Response) => {
  try {
    const { mint, creator, holderSplitBps: rawSplitBps, maxHolders: rawMaxHolders, claimExpiryHours: rawExpiryHours } = req.body;

    if (!mint || !creator) {
      res.status(400).json({ error: "mint and creator are required" });
      return;
    }

    const holderSplitBps = rawSplitBps != null ? parseInt(String(rawSplitBps), 10) : config.defaultHolderSplitBps;
    if (!isValidBps(holderSplitBps)) {
      res.status(400).json({ error: "holderSplitBps must be an integer between 0 and 10000" });
      return;
    }

    const maxHolders = rawMaxHolders != null ? parseInt(String(rawMaxHolders), 10) : 100;
    if (!Number.isInteger(maxHolders) || maxHolders < 100 || maxHolders > 512) {
      res.status(400).json({ error: "maxHolders must be an integer between 100 and 512" });
      return;
    }

    const claimExpiryHours = rawExpiryHours != null ? parseInt(String(rawExpiryHours), 10) : undefined;
    if (claimExpiryHours != null && (!Number.isInteger(claimExpiryHours) || claimExpiryHours < 6 || claimExpiryHours > 720)) {
      res.status(400).json({ error: "claimExpiryHours must be an integer between 6 and 720" });
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

    const connection = getConnection();

    // --- Validation: is this a real PumpFun token? ---
    const bcPda = bondingCurvePda(mintPubkey);
    const bcInfo = await connection.getAccountInfo(bcPda);
    if (!bcInfo) {
      res.status(400).json({ error: "Not a PumpFun token (no bonding curve found)" });
      return;
    }

    // --- Validation: vault doesn't already exist ---
    const [vaultPda] = deriveVaultPda(mintPubkey);
    const vaultInfo = await connection.getAccountInfo(vaultPda);
    if (vaultInfo) {
      res.status(409).json({
        error: "Vault already exists for this token",
        mint,
        vaultDashboard: `/vault/${mint}`,
      });
      return;
    }

    // --- Validation: caller is the token creator ---
    const actualCreator = await resolveCreator(connection, mintPubkey);
    if (!actualCreator) {
      res.status(400).json({ error: "Could not determine the token creator" });
      return;
    }
    if (!actualCreator.equals(creatorPubkey)) {
      res.status(403).json({
        error: "Connected wallet is not the token creator",
      });
      return;
    }

    // --- Detect fee sharing state ---
    const feeSharingState = await detectFeeSharingState(connection, mintPubkey);

    if (feeSharingState.status === "revoked_wrong_target") {
      const currentTarget = feeSharingState.currentShareholders
        .map((s) => s.address.toBase58())
        .join(", ");
      res.status(409).json({
        error:
          "Fee sharing authority is revoked and points to a different address. " +
          "Cannot automatically configure fee sharing for this token.",
        currentShareholders: currentTarget,
        feeAccountPda: feeSharingState.feeAccountPda.toBase58(),
      });
      return;
    }

    // --- Build instructions ---
    const feeSharingIxs = await buildFeeSharingIxs(
      connection,
      creatorPubkey,
      mintPubkey,
      feeSharingState
    );
    const createVaultIx = buildCreateVaultIx(creatorPubkey, mintPubkey);
    const allIxs = [...feeSharingIxs, createVaultIx];

    const [feeAccount] = deriveFeeAccountPda(mintPubkey);

    // Fetch metadata from PumpFun and store vault record in DB
    const pumpMeta = await fetchPumpMetadata(mint);
    await storeVault({
      mint,
      creator,
      name: pumpMeta?.name || "Unknown",
      symbol: pumpMeta?.symbol || "???",
      metadataUri: pumpMeta?.metadataUri || "",
      imageUrl: pumpMeta?.imageUrl || undefined,
      bondingCurve: pumpMeta?.bondingCurve || undefined,
      feeAccount: feeAccount.toBase58(),
      maxHolders,
      holderSplitBps,
      platformFeeBps: await fetchPlatformFeeBps(),
      claimExpiryHours,
    });

    console.log(
      `[vault/build-create] mint=${mint} status=${feeSharingState.status} ixCount=${allIxs.length} name=${pumpMeta?.name || "?"} maxHolders=${maxHolders}`
    );

    res.json({
      success: true,
      instructionSet: {
        instructions: allIxs.map(serializeIx),
        mintMustSign: false,
      },
      feeAccount: feeAccount.toBase58(),
      feeSharingStatus: feeSharingState.status,
      isGraduated: feeSharingState.isGraduated,
    });
  } catch (err: any) {
    console.error("[vault/build-create] Error:", err);
    res.status(500).json({ error: "Failed to build vault creation instructions" });
  }
});

/**
 * POST /api/vault/confirm-create
 *
 * Confirms the vault creation TX on-chain and registers with the cranker.
 */
router.post("/confirm-create", async (req: Request, res: Response) => {
  try {
    const { mint, signature } = req.body;

    if (!mint || !signature) {
      res.status(400).json({ error: "mint and signature are required" });
      return;
    }

    const mintPubkey = parsePubkey(mint);
    if (!mintPubkey) {
      res.status(400).json({ error: "Invalid mint address" });
      return;
    }

    const connection = getConnection();

    // Verify TX confirmed
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

    // Verify vault exists on-chain
    const [vaultPda] = deriveVaultPda(mintPubkey);
    const vaultInfo = await connection.getAccountInfo(vaultPda);
    if (!vaultInfo) {
      res.status(400).json({ error: "Vault account not found on-chain after TX" });
      return;
    }

    // Check fee sharing state for response
    const feeSharingState = await detectFeeSharingState(connection, mintPubkey);
    const [feeAccount] = deriveFeeAccountPda(mintPubkey);

    // Update DB flags — vault + fee sharing are confirmed on-chain
    const sharingConfigPda = feeSharingConfigPda(mintPubkey);
    const sharingAccount = await connection.getAccountInfo(sharingConfigPda);
    if (sharingAccount) {
      await confirmVault(mint);
    }
    await markVaultCreated(mint);

    // Read vault from DB (stored during build-create) and pass metadata + split config to cranker
    const vault = await getVault(mint);
    const crankerResult = await registerVaultWithCranker(mint, vault!.creator, {
      name: vault?.name ?? undefined,
      symbol: vault?.symbol ?? undefined,
      metadataUri: vault?.metadataUri ?? undefined,
      imageUrl: vault?.imageUrl ?? undefined,
      maxHolders: vault?.maxHolders,
      holderSplitBps: vault?.holderSplitBps,
      claimExpiryHours: vault?.claimExpiryHours ?? undefined,
      distributionMode: "push",
    });
    if (!crankerResult.success) {
      console.error(`[vault/confirm-create] Cranker registration failed: ${crankerResult.error}`);
      // Don't fail the response — vault is on-chain, cranker can be retried
    }

    console.log(
      `[vault/confirm-create] Confirmed: mint=${mint} cranker=${crankerResult.success}`
    );

    res.json({
      success: true,
      mint,
      feeAccount: feeAccount.toBase58(),
      feeSharingStatus: feeSharingState.status,
      crankerRegistered: crankerResult.success,
    });
  } catch (err: any) {
    console.error("[vault/confirm-create] Error:", err);
    res.status(500).json({ error: "Confirmation failed" });
  }
});

/**
 * GET /api/vault/status/:mint
 *
 * Check vault status: on-chain existence + cranker registration + fee sharing state.
 */
router.get("/status/:mint", async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const mint = req.params.mint;
    const mintPubkey = parsePubkey(mint);
    if (!mintPubkey) {
      res.status(400).json({ error: "Invalid mint address" });
      return;
    }
    const connection = getConnection();

    const [vaultPda] = deriveVaultPda(mintPubkey);
    const [feeAccount] = deriveFeeAccountPda(mintPubkey);

    const [vaultInfo, feeSharingState] = await Promise.all([
      connection.getAccountInfo(vaultPda),
      detectFeeSharingState(connection, mintPubkey),
    ]);

    res.json({
      mint,
      vaultExists: vaultInfo !== null,
      feeAccount: feeAccount.toBase58(),
      feeSharingStatus: feeSharingState.status,
      isGraduated: feeSharingState.isGraduated,
    });
  } catch (err: any) {
    console.error("[vault/status] Error:", err);
    res.status(500).json({ error: "Failed to check vault status" });
  }
});

/**
 * GET /api/vault/:mint/split
 * Query vault's fee config + computed percentages.
 */
router.get("/split/:mint", async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const vault = await getVault(req.params.mint);
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const platformPct = vault.platformFeeBps / 100;
    const afterPlatform = 100 - platformPct;
    const buybackBps = vault.buybackEnabled ? vault.buybackSplitBps : 0;
    const holderPct = (vault.holderSplitBps / 10000) * afterPlatform;
    const buybackPct = (buybackBps / 10000) * afterPlatform;
    const lpPct = afterPlatform - holderPct - buybackPct;

    res.json({
      mint: vault.tokenMint,
      maxHolders: vault.maxHolders,
      holderSplitBps: vault.holderSplitBps,
      platformFeeBps: vault.platformFeeBps,
      platformPct,
      holderPct,
      lpPct,
      buybackEnabled: vault.buybackEnabled,
      buybackSplitBps: vault.buybackSplitBps,
      buybackAction: vault.buybackAction,
      buybackThresholdSol: vault.buybackThresholdSol.toString(),
      buybackPct,
      pendingBuybackSol: vault.pendingBuybackSol.toString(),
      totalBuybackSol: vault.totalBuybackSol.toString(),
      buybackTokenBalance: vault.buybackTokenBalance.toString(),
      pendingSplitBps: vault.pendingSplitBps,
      splitProposedAt: vault.splitProposedAt?.toISOString() ?? null,
      splitEffectiveAt: vault.splitEffectiveAt?.toISOString() ?? null,
      graduated: vault.graduated,
      lpDeployed: vault.lpDeployed,
      lpPoolKey: vault.lpPoolKey,
      pendingLpSol: vault.pendingLpSol.toString(),
      totalPlatformFees: vault.totalPlatformFees.toString(),
      claimExpiryHours: vault.claimExpiryHours,
      distributionMode: vault.distributionMode,
    });
  } catch (err: any) {
    console.error("[vault/split] Error:", err);
    res.status(500).json({ error: "Failed to fetch split config" });
  }
});

/**
 * POST /api/vault/:mint/propose-split
 * Propose a split change (requires wallet signature, 7-day timelock).
 */
router.post("/propose-split/:mint", optionalPrivyAuth, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const { newBps, timestamp } = req.body;

    if (newBps == null) {
      res.status(400).json({ error: "newBps is required" });
      return;
    }

    const parsedBps = parseInt(String(newBps), 10);
    if (!isValidBps(parsedBps)) {
      res.status(400).json({ error: "newBps must be an integer between 0 and 10000" });
      return;
    }

    // Try custodial auth (JWT-verified identity), fall back to wallet signature
    let vault = await verifyCustodialCreator(req, res);
    if (!vault) {
      if (res.headersSent) return; // verifyCustodialCreator sent an error
      const ts = parseInt(String(timestamp), 10);
      const message = `Anvil:propose-split:${req.params.mint}:${parsedBps}:${ts}`;
      vault = await verifyCreatorSignature(req, res, message);
    }
    if (!vault) return;

    const LOCK_DAYS = 7;
    const effectiveAt = new Date(Date.now() + LOCK_DAYS * 24 * 60 * 60 * 1000);

    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: {
        pendingSplitBps: parsedBps,
        splitProposedAt: new Date(),
        splitEffectiveAt: effectiveAt,
      },
    });

    console.log(`[vault/propose-split] ${req.params.mint}: proposed ${parsedBps}bps, effective ${effectiveAt.toISOString()}`);

    res.json({
      success: true,
      pendingSplitBps: parsedBps,
      splitEffectiveAt: effectiveAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[vault/propose-split] Error:", err);
    res.status(500).json({ error: "Failed to propose split change" });
  }
});

/**
 * DELETE /api/vault/:mint/propose-split
 * Cancel pending split change (requires wallet signature).
 */
router.delete("/propose-split/:mint", optionalPrivyAuth, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    // Try custodial auth, fall back to wallet signature
    let vault = await verifyCustodialCreator(req, res);
    if (!vault) {
      if (res.headersSent) return;
      const { timestamp } = req.body;
      const ts = parseInt(String(timestamp), 10);
      const message = `Anvil:cancel-split:${req.params.mint}:${ts}`;
      vault = await verifyCreatorSignature(req, res, message);
    }
    if (!vault) return;

    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: {
        pendingSplitBps: null,
        splitProposedAt: null,
        splitEffectiveAt: null,
      },
    });

    console.log(`[vault/cancel-split] ${req.params.mint}: cancelled`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[vault/cancel-split] Error:", err);
    res.status(500).json({ error: "Failed to cancel split change" });
  }
});

/**
 * POST /api/vault/:mint/configure-buyback
 * Enable/disable buyback + set parameters. Creator-only.
 * No timelock — takes effect immediately.
 */
router.post("/configure-buyback/:mint", optionalPrivyAuth, strictLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const { enabled, buybackSplitBps: rawBps, buybackAction: rawAction, buybackThresholdSol: rawThreshold, timestamp } = req.body;

    if (enabled == null) {
      res.status(400).json({ error: "enabled is required" });
      return;
    }

    const isEnabled = Boolean(enabled);

    // Validate buybackSplitBps if enabling
    let parsedBps: number | undefined;
    if (isEnabled) {
      if (rawBps == null) {
        res.status(400).json({ error: "buybackSplitBps is required when enabling buyback" });
        return;
      }
      parsedBps = parseInt(String(rawBps), 10);
      if (!Number.isInteger(parsedBps) || parsedBps < 1 || parsedBps > 10000) {
        res.status(400).json({ error: "buybackSplitBps must be between 1 and 10000" });
        return;
      }
    }

    // Validate action
    let action: string | undefined;
    if (rawAction != null) {
      action = String(rawAction);
      if (action !== "hold" && action !== "burn") {
        res.status(400).json({ error: "buybackAction must be 'hold' or 'burn'" });
        return;
      }
    }

    // Validate threshold (minimum 0.1 SOL = 100_000_000 lamports)
    let threshold: bigint | undefined;
    if (rawThreshold != null) {
      try {
        threshold = BigInt(rawThreshold);
        if (threshold < 100_000_000n) {
          res.status(400).json({ error: "buybackThresholdSol must be at least 100000000 (0.1 SOL)" });
          return;
        }
      } catch {
        res.status(400).json({ error: "Invalid buybackThresholdSol value" });
        return;
      }
    }

    // Auth: try custodial, fall back to wallet signature
    let vault = await verifyCustodialCreator(req, res);
    if (!vault) {
      if (res.headersSent) return;
      const ts = parseInt(String(timestamp), 10);
      const message = `Anvil:configure-buyback:${req.params.mint}:${isEnabled}:${parsedBps ?? 0}:${ts}`;
      vault = await verifyCreatorSignature(req, res, message);
    }
    if (!vault) return;

    // Validate holderSplitBps + buybackSplitBps <= 10000
    const effectiveBuybackBps = isEnabled ? (parsedBps ?? vault.buybackSplitBps) : 0;
    if (vault.holderSplitBps + effectiveBuybackBps > 10000) {
      res.status(400).json({
        error: `holderSplitBps (${vault.holderSplitBps}) + buybackSplitBps (${effectiveBuybackBps}) exceeds 10000`,
      });
      return;
    }

    const updateData: Record<string, any> = {
      buybackEnabled: isEnabled,
    };
    if (parsedBps != null) updateData.buybackSplitBps = parsedBps;
    if (action != null) updateData.buybackAction = action;
    if (threshold != null) updateData.buybackThresholdSol = threshold;
    if (!isEnabled) updateData.buybackSplitBps = 0;

    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: updateData,
    });

    console.log(`[vault/configure-buyback] ${req.params.mint}: enabled=${isEnabled} bps=${parsedBps ?? "unchanged"} action=${action ?? "unchanged"}`);

    res.json({ success: true, ...updateData, buybackThresholdSol: updateData.buybackThresholdSol?.toString() });
  } catch (err: any) {
    console.error("[vault/configure-buyback] Error:", err);
    res.status(500).json({ error: "Failed to configure buyback" });
  }
});

const CLOSE_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * POST /api/vault/:mint/request-close
 * Creator requests vault closure — starts 72h grace period.
 */
router.post("/request-close/:mint", optionalPrivyAuth, strictLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    // Try custodial auth, fall back to wallet signature
    let vault = await verifyCustodialCreator(req, res);
    if (!vault) {
      if (res.headersSent) return;
      const { timestamp } = req.body;
      const ts = parseInt(String(timestamp), 10);
      const message = `Anvil:request-close:${req.params.mint}:${ts}`;
      vault = await verifyCreatorSignature(req, res, message);
    }
    if (!vault) return;

    if (!vault.active) {
      res.status(400).json({ error: "Vault is already closed" });
      return;
    }
    if (vault.closeRequestedAt) {
      res.status(409).json({ error: "Close already requested" });
      return;
    }

    const now = new Date();
    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: { closeRequestedAt: now },
    });

    console.log(`[vault/request-close] ${req.params.mint}: close requested, grace period until ${new Date(now.getTime() + CLOSE_GRACE_PERIOD_MS).toISOString()}`);
    res.json({ success: true, closeRequestedAt: now.toISOString() });
  } catch (err: any) {
    console.error("[vault/request-close] Error:", err);
    res.status(500).json({ error: "Failed to request close" });
  }
});

/**
 * POST /api/vault/:mint/cancel-close
 * Creator cancels pending vault closure.
 */
router.post("/cancel-close/:mint", optionalPrivyAuth, strictLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    // Try custodial auth, fall back to wallet signature
    let vault = await verifyCustodialCreator(req, res);
    if (!vault) {
      if (res.headersSent) return;
      const { timestamp } = req.body;
      const ts = parseInt(String(timestamp), 10);
      const message = `Anvil:cancel-close:${req.params.mint}:${ts}`;
      vault = await verifyCreatorSignature(req, res, message);
    }
    if (!vault) return;

    if (!vault.closeRequestedAt) {
      res.status(409).json({ error: "No close request pending" });
      return;
    }

    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: { closeRequestedAt: null },
    });

    console.log(`[vault/cancel-close] ${req.params.mint}: close request cancelled`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[vault/cancel-close] Error:", err);
    res.status(500).json({ error: "Failed to cancel close request" });
  }
});

/**
 * POST /api/vault/:mint/confirm-close
 * Confirms on-chain close_vault TX after grace period. Marks vault inactive in DB.
 */
router.post("/confirm-close/:mint", strictLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const { signature } = req.body;
    if (!signature) {
      res.status(400).json({ error: "signature is required" });
      return;
    }

    const vault = await getVault(req.params.mint);
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }
    if (!vault.closeRequestedAt) {
      res.status(400).json({ error: "No close request pending" });
      return;
    }

    // Enforce grace period
    const elapsed = Date.now() - vault.closeRequestedAt.getTime();
    if (elapsed < CLOSE_GRACE_PERIOD_MS) {
      res.status(400).json({ error: "Grace period has not elapsed" });
      return;
    }

    // Verify TX confirmed on-chain
    const connection = getConnection();
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    const confirmationStatus = status.value?.confirmationStatus;
    if (!confirmationStatus || !["confirmed", "finalized"].includes(confirmationStatus)) {
      res.status(400).json({ error: "Transaction not confirmed" });
      return;
    }

    await prisma.vault.update({
      where: { tokenMint: req.params.mint },
      data: {
        active: false,
        closeRequestedAt: null,
        pausedAt: new Date(),
        pauseReason: "Closed by creator",
      },
    });

    console.log(`[vault/confirm-close] ${req.params.mint}: vault closed`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[vault/confirm-close] Error:", err);
    res.status(500).json({ error: "Failed to confirm close" });
  }
});

/**
 * POST /api/vault/close-sign-and-submit
 * Build a close_vault TX server-side, sign with custodial wallet, and submit.
 * Auth: requireAnyAuth (bot API key or Privy JWT).
 * Enforces: vault ownership, close request exists, grace period elapsed.
 */
router.post("/close-sign-and-submit", requireAnyAuth, strictLimit, async (req: Request, res: Response) => {
  try {
    const xUserId = resolveXUserId(req);
    if (!xUserId) {
      res.status(400).json({ error: "xUserId is required" });
      return;
    }

    const { mint } = req.body;
    if (!mint) {
      res.status(400).json({ error: "mint is required" });
      return;
    }

    const mintPubkey = parsePubkey(mint);
    if (!mintPubkey) {
      res.status(400).json({ error: "Invalid mint address" });
      return;
    }

    // Lookup custodial wallet
    const wallet = await getCustodialWallet(xUserId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    // Verify vault exists and user is creator
    const vault = await getVault(mint);
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    if (wallet.publicKey !== vault.creator) {
      res.status(403).json({ error: "Only the vault creator can close the vault" });
      return;
    }

    if (!vault.active) {
      res.status(400).json({ error: "Vault is already closed" });
      return;
    }

    if (!vault.closeRequestedAt) {
      res.status(400).json({ error: "No close request pending" });
      return;
    }

    // Enforce grace period
    const elapsed = Date.now() - vault.closeRequestedAt.getTime();
    if (elapsed < CLOSE_GRACE_PERIOD_MS) {
      const remainingMs = CLOSE_GRACE_PERIOD_MS - elapsed;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      res.status(400).json({ error: `Grace period has not elapsed. ${remainingHours}h remaining.` });
      return;
    }

    // Build close_vault TX
    const creatorPubkey = new PublicKey(wallet.publicKey);
    const serializedTx = await buildCloseVaultTx(creatorPubkey, mintPubkey);

    // Sign and submit via custodial signer
    const signature = await signAndSubmitCustodial({
      xUserId,
      serializedTx,
    });

    // Mark vault as closed in DB
    await prisma.vault.update({
      where: { tokenMint: mint },
      data: {
        active: false,
        closeRequestedAt: null,
        pausedAt: new Date(),
        pauseReason: "Closed by creator",
      },
    });

    console.log(`[vault/close-sign-and-submit] ${mint}: vault closed by ${xUserId} sig=${signature.slice(0, 16)}...`);
    res.json({ success: true, signature });
  } catch (err) {
    if (err instanceof SecurityError) {
      res.status(403).json({ error: "Transaction rejected by security validation" });
      return;
    }
    console.error("[vault/close-sign-and-submit] Error:", err);
    res.status(500).json({ error: "Failed to close vault" });
  }
});

/**
 * Resolve the actual creator wallet for a PumpFun token.
 *
 * If fee sharing is active, the bonding curve's "creator" field is the
 * fee sharing config PDA — the real creator is in the config's "admin" field.
 * If no fee sharing, the bonding curve's "creator" is the real wallet.
 */
async function resolveCreator(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey | null> {
  try {
    const bc = await getOnlineSdk().fetchBondingCurve(mint);
    const creatorField = bc.creator as PublicKey;
    const configPda = feeSharingConfigPda(mint);

    if (creatorField.equals(configPda)) {
      // Fee sharing is active — real creator is the admin in the config
      const configInfo = await connection.getAccountInfo(configPda);
      if (!configInfo) return null;
      const decoded = pumpSdk.decodeSharingConfig(configInfo);
      return decoded.admin as PublicKey;
    }

    return creatorField;
  } catch {
    return null;
  }
}

export default router;
