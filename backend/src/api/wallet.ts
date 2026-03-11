import { Router, Request, Response } from "express";
import { requireBotAuth } from "../middleware/botAuth";
import { requirePrivyAuth, requireAnyAuth, resolveXUserId, resolveXUsername } from "../middleware/privyAuth";
import { walletCreateLimit, strictLimit } from "../middleware/rateLimits";
import {
  createCustodialWallet,
  getCustodialWallet,
  getCustodialBalance,
  checkAndIncrementLaunchCount,
  updatePreferences,
} from "../wallet/custodialWalletStore";
import { signAndSubmitCustodial, SecurityError } from "../wallet/custodialSigner";

const router = Router();

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/wallet/create
 * Create a custodial wallet for an X user.
 * Accepts both bot auth (from X bot) and Privy auth (from frontend).
 */
router.post("/create", requireAnyAuth, walletCreateLimit, async (req: Request, res: Response) => {
  try {
    const xUserId = resolveXUserId(req);
    if (!xUserId) {
      res.status(400).json({ error: "xUserId is required" });
      return;
    }

    const xUsername = resolveXUsername(req);
    const result = await createCustodialWallet(xUserId, xUsername);

    if (!result.isNew) {
      res.status(409).json({ success: true, publicKey: result.publicKey, existing: true });
      return;
    }

    res.json({ success: true, publicKey: result.publicKey });
  } catch (err) {
    console.error("[wallet/create] Error:", err);
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

/**
 * GET /api/wallet/me
 * Lookup wallet for the authenticated user (frontend path — xUserId from JWT).
 */
router.get("/me", requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = (req as any).privyUser?.xUserId;
    if (!xUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const wallet = await getCustodialWallet(xUserId);
    if (!wallet) {
      res.json({ success: false });
      return;
    }

    res.json({ success: true, ...wallet });
  } catch (err) {
    console.error("[wallet/me] Error:", err);
    res.status(500).json({ error: "Failed to lookup wallet" });
  }
});

/**
 * GET /api/wallet/me/balance
 * Get balance for the authenticated user (frontend path).
 */
router.get("/me/balance", requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = (req as any).privyUser?.xUserId;
    if (!xUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const wallet = await getCustodialWallet(xUserId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const balance = await getCustodialBalance(wallet.publicKey);
    res.json({ success: true, ...balance });
  } catch (err) {
    console.error("[wallet/me/balance] Error:", err);
    res.status(500).json({ error: "Failed to get balance" });
  }
});

/**
 * GET /api/wallet/:xUserId
 * Lookup wallet by xUserId. Bot-only route (prevents user enumeration).
 */
router.get("/:xUserId", requireBotAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = req.params.xUserId as string;
    const wallet = await getCustodialWallet(xUserId);

    if (!wallet) {
      res.json({ success: false });
      return;
    }

    res.json({ success: true, publicKey: wallet.publicKey, xUsername: wallet.xUsername });
  } catch (err) {
    console.error("[wallet/:xUserId] Error:", err);
    res.status(500).json({ error: "Failed to lookup wallet" });
  }
});

/**
 * GET /api/wallet/:xUserId/balance
 * Get balance by xUserId. Bot-only route.
 */
router.get("/:xUserId/balance", requireBotAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = req.params.xUserId as string;
    const wallet = await getCustodialWallet(xUserId);

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const balance = await getCustodialBalance(wallet.publicKey);
    res.json({ success: true, ...balance });
  } catch (err) {
    console.error("[wallet/:xUserId/balance] Error:", err);
    res.status(500).json({ error: "Failed to get balance" });
  }
});

/**
 * POST /api/wallet/sign-and-submit
 * Sign a transaction with the user's custodial wallet and submit to Solana.
 * This is the critical route — all security validation happens in custodialSigner.
 */
router.post("/sign-and-submit", requireAnyAuth, strictLimit, async (req: Request, res: Response) => {
  try {
    const xUserId = resolveXUserId(req);
    if (!xUserId) {
      res.status(400).json({ error: "xUserId is required" });
      return;
    }

    const { serializedTx, instructionSet, mintSecretKey } = req.body;

    const signature = await signAndSubmitCustodial({
      xUserId,
      serializedTx,
      instructionSet,
      mintSecretKey,
    });

    res.json({ success: true, signature });
  } catch (err) {
    if (err instanceof SecurityError) {
      res.status(403).json({ error: "Transaction rejected by security validation" });
      return;
    }
    console.error("[wallet/sign-and-submit] Error:", err);
    res.status(500).json({ error: "Failed to sign and submit transaction" });
  }
});

/**
 * POST /api/wallet/check-rate-limit
 * Check and increment daily launch count.
 */
router.post("/check-rate-limit", requireAnyAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = resolveXUserId(req);
    if (!xUserId) {
      res.status(400).json({ error: "xUserId is required" });
      return;
    }

    const result = await checkAndIncrementLaunchCount(xUserId);
    res.json(result);
  } catch (err) {
    console.error("[wallet/check-rate-limit] Error:", err);
    res.status(500).json({ error: "Failed to check rate limit" });
  }
});

/**
 * POST /api/wallet/update-prefs
 * Update default launch preferences.
 */
router.post("/update-prefs", requireAnyAuth, async (req: Request, res: Response) => {
  try {
    const xUserId = resolveXUserId(req);
    if (!xUserId) {
      res.status(400).json({ error: "xUserId is required" });
      return;
    }

    const { defaultSplitBps, defaultMaxHolders, defaultDevBuySol, defaultExpiryHours } = req.body;

    await updatePreferences(xUserId, {
      defaultSplitBps,
      defaultMaxHolders,
      defaultDevBuySol,
      defaultExpiryHours,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[wallet/update-prefs] Error:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

export default router;
