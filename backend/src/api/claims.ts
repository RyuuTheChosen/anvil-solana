import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { crankerGet } from "../lib/crankerClient";
import { parsePubkey } from "../lib/validate";
import { readLimit, strictLimit } from "../middleware/rateLimits";
import { requireAnyAuth, resolveXUserId } from "../middleware/privyAuth";
import { getCustodialWallet } from "../wallet/custodialWalletStore";
import { signAndSubmitCustodial, SecurityError } from "../wallet/custodialSigner";
import { buildClaimTx } from "../lib/claimBuilder";

const router = Router();

function proxyCranker(path: string, res: Response): void {
  crankerGet(path)
    .then(({ ok, status, data }) => {
      res.status(status).json(data);
    })
    .catch(() => {
      res.status(502).json({ error: "Cranker service unavailable" });
    });
}

/**
 * GET /api/claims/distributions/:mint
 * Proxy to cranker: distribution info for a vault.
 */
router.get("/distributions/:mint", readLimit, (req: Request<{ mint: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint)) {
    res.status(400).json({ error: "Invalid mint address" });
    return;
  }
  proxyCranker(`/api/distributions/${req.params.mint}`, res);
});

/**
 * GET /api/claims/user/:wallet
 * Proxy to cranker: all claimable vaults for a wallet.
 */
router.get("/user/:wallet", readLimit, (req: Request<{ wallet: string }>, res: Response) => {
  if (!parsePubkey(req.params.wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  proxyCranker(`/api/claims/user/${req.params.wallet}`, res);
});

/**
 * GET /api/claims/proof/:mint/:wallet
 * Proxy to cranker: claim proof + claimable amount for a specific wallet.
 */
router.get("/proof/:mint/:wallet", readLimit, (req: Request<{ mint: string; wallet: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint) || !parsePubkey(req.params.wallet)) {
    res.status(400).json({ error: "Invalid mint or wallet address" });
    return;
  }
  proxyCranker(`/api/claims/proof/${req.params.mint}/${req.params.wallet}`, res);
});

/**
 * GET /api/claims/history/:mint/:wallet
 * Proxy to cranker: push distribution history for a wallet.
 */
router.get("/history/:mint/:wallet", readLimit, (req: Request<{ mint: string; wallet: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint) || !parsePubkey(req.params.wallet)) {
    res.status(400).json({ error: "Invalid mint or wallet address" });
    return;
  }
  proxyCranker(`/api/claims/history/${req.params.mint}/${req.params.wallet}`, res);
});

/**
 * POST /api/claims/sign-and-submit
 * Build a claim TX server-side, sign with custodial wallet, and submit.
 * Auth: requireAnyAuth (bot API key or Privy JWT).
 */
router.post("/sign-and-submit", requireAnyAuth, strictLimit, async (req: Request, res: Response) => {
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

    // Fetch claim proof from cranker
    const proofRes = await crankerGet<{
      cumulativeAmount: string;
      proof: string[];
      claimable: string;
      expired?: boolean;
    }>(`/api/claims/proof/${mint}/${wallet.publicKey}`);

    if (!proofRes.ok) {
      res.status(proofRes.status).json(proofRes.data);
      return;
    }

    const proofData = proofRes.data;
    const claimable = BigInt(proofData.claimable || "0");

    if (claimable <= 0n) {
      res.status(400).json({ error: "Nothing to claim" });
      return;
    }

    if (proofData.expired) {
      res.status(400).json({ error: "Claim has expired" });
      return;
    }

    // Build claim TX
    const userPubkey = new PublicKey(wallet.publicKey);
    const serializedTx = await buildClaimTx(
      userPubkey,
      mintPubkey,
      BigInt(proofData.cumulativeAmount),
      proofData.proof,
    );

    // Sign and submit via custodial signer
    const signature = await signAndSubmitCustodial({
      xUserId,
      serializedTx,
    });

    console.log(`[claims/sign-and-submit] user=${xUserId} mint=${mint} claimed=${claimable.toString()} sig=${signature.slice(0, 16)}...`);
    res.json({ success: true, signature });
  } catch (err) {
    if (err instanceof SecurityError) {
      res.status(403).json({ error: "Transaction rejected by security validation" });
      return;
    }
    console.error("[claims/sign-and-submit] Error:", err);
    res.status(500).json({ error: "Failed to sign and submit claim" });
  }
});

export default router;
