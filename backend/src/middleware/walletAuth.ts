import { Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config/env";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nacl = require("tweetnacl") as {
  sign: { detached: { verify(msg: Uint8Array, sig: Uint8Array, pk: Uint8Array): boolean } };
};

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware that verifies admin requests via wallet signature.
 *
 * Expected headers:
 *   x-admin-wallet    — base58 public key
 *   x-admin-signature — base64-encoded ed25519 signature
 *   x-admin-timestamp — unix ms timestamp
 *
 * Signed message format: "anvil-admin:{timestamp}"
 */
export function requireWalletAuth(req: Request, res: Response, next: NextFunction): void {
  const wallet = req.headers["x-admin-wallet"] as string | undefined;
  const signature = req.headers["x-admin-signature"] as string | undefined;
  const timestamp = req.headers["x-admin-timestamp"] as string | undefined;

  if (!wallet || !signature || !timestamp) {
    res.status(401).json({ error: "Missing admin authentication headers" });
    return;
  }

  // Validate timestamp
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    res.status(401).json({ error: "Admin signature expired or invalid timestamp" });
    return;
  }

  // Validate wallet is in allowed list
  if (!config.adminWallets.includes(wallet)) {
    res.status(403).json({ error: "Wallet not authorized as admin" });
    return;
  }

  // Validate pubkey format
  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = new PublicKey(wallet).toBytes();
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  // Verify signature
  const message = `anvil-admin:${ts}`;
  const messageBytes = new TextEncoder().encode(message);
  const sigBytes = Buffer.from(signature, "base64");

  if (!nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes)) {
    res.status(403).json({ error: "Invalid admin signature" });
    return;
  }

  next();
}
