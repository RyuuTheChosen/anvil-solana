import { Request, Response, NextFunction } from "express";
import { PrivyClient } from "@privy-io/server-auth";
import crypto from "crypto";
import { config } from "../config/env";

// ─── Privy Client (singleton) ───────────────────────────────────────────────

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    if (!config.privyAppId || !config.privyAppSecret) {
      throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be configured");
    }
    privyClient = new PrivyClient(config.privyAppId, config.privyAppSecret);
  }
  return privyClient;
}

// ─── Middleware: Require Privy JWT ───────────────────────────────────────────

/**
 * Verify Privy JWT from Authorization header.
 * Extracts Twitter linked account → sets req.privyUser.
 */
export async function requirePrivyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authentication" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const client = getPrivyClient();
    const verifiedClaims = await client.verifyAuthToken(token);

    // Get the full user to find linked Twitter account
    const user = await client.getUser(verifiedClaims.userId);

    const twitter = user.linkedAccounts.find(
      (a: any) => a.type === "twitter_oauth"
    ) as any;
    if (!twitter) {
      res.status(403).json({ error: "No Twitter account linked" });
      return;
    }

    (req as any).privyUser = {
      xUserId: twitter.subject,
      xUsername: twitter.username || "unknown",
    };

    next();
  } catch (err: any) {
    // Don't log the token value
    console.error("[privyAuth] Verification failed:", err.message || "unknown error");
    res.status(401).json({ error: "Invalid or expired authentication" });
  }
}

// ─── Middleware: Require Any Auth (Bot OR Privy) ────────────────────────────

// Routes the bot API key is allowed to access (duplicated from botAuth.ts for independence)
const ALLOWED_BOT_ROUTES = [
  "/api/launch/",
  "/api/wallet/",
  "/api/claims/sign-and-submit",
  "/api/vault/close-sign-and-submit",
];

/**
 * Try bot API key first (fast local check), then Privy JWT (network call).
 * Bot API key is random base64 bytes. Privy JWT starts with "eyJ".
 */
export async function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authentication" });
    return;
  }

  const token = authHeader.slice(7);

  // Fast path: check if token matches BOT_API_KEY (timing-safe, no network)
  if (token && config.botApiKey && timingSafeEqual(token, config.botApiKey)) {
    // Verify route is in bot allowlist
    const path = req.originalUrl || req.path;
    if (!ALLOWED_BOT_ROUTES.some((prefix) => path.startsWith(prefix))) {
      res.status(403).json({ error: "Route not accessible with bot auth" });
      return;
    }
    (req as any).botAuthenticated = true;
    return next();
  }

  // Slow path: verify Privy JWT
  return requirePrivyAuth(req, res, next);
}

// ─── Middleware: Optional Privy Auth ─────────────────────────────────────────

/**
 * Optional Privy auth — sets req.privyUser if valid JWT present, otherwise continues.
 * Used for routes that support both custodial (JWT) and signature-based auth.
 * Never rejects — if JWT is missing or invalid, the request proceeds without req.privyUser.
 */
export async function optionalPrivyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  // Skip if this is the bot API key (use timing-safe compare, not heuristic)
  if (config.botApiKey && timingSafeEqual(token, config.botApiKey)) {
    return next();
  }

  try {
    const client = getPrivyClient();
    const verifiedClaims = await client.verifyAuthToken(token);
    const user = await client.getUser(verifiedClaims.userId);

    const twitter = user.linkedAccounts.find(
      (a: any) => a.type === "twitter_oauth"
    ) as any;
    if (twitter) {
      (req as any).privyUser = {
        xUserId: twitter.subject,
        xUsername: twitter.username || "unknown",
      };
    }
  } catch {
    // JWT invalid or verification failed — continue without auth
  }

  next();
}

// ─── Shared Auth Helper ──────────────────────────────────────────────────────

/**
 * Resolve xUserId from auth context.
 * Frontend path: extracts from verified Privy JWT (NEVER trusts request body).
 * Bot path: trusts xUserId from request body (API key already verified).
 */
export function resolveXUserId(req: Request): string | null {
  if ((req as any).botAuthenticated) {
    return req.body?.xUserId || null;
  }
  if ((req as any).privyUser?.xUserId) {
    return (req as any).privyUser.xUserId;
  }
  return null;
}

/**
 * Resolve xUsername from auth context.
 */
export function resolveXUsername(req: Request): string {
  if ((req as any).botAuthenticated) {
    return req.body?.xUsername || "unknown";
  }
  if ((req as any).privyUser?.xUsername) {
    return (req as any).privyUser.xUsername;
  }
  return "unknown";
}

/**
 * Timing-safe string comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}
