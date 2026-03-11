import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

// Track failed auth attempts per IP for rate limiting
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_FAILURES = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 60 * 1000; // 1 minute

// Routes the bot API key is allowed to access
const ALLOWED_BOT_ROUTES = [
  "/api/launch/",
  "/api/wallet/",
];

/**
 * Middleware that validates BOT_API_KEY using timing-safe comparison.
 * Sets req.botAuthenticated = true on success.
 * Rate-limits failed attempts: 5 failures/IP/minute → 15-min block.
 */
export function requireBotAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || "unknown";

  // Check if IP is currently blocked
  const attempt = failedAttempts.get(ip);
  if (attempt && attempt.blockedUntil > Date.now()) {
    res.status(429).json({ error: "Too many failed auth attempts. Try again later." });
    return;
  }

  // Check API key is configured
  if (!config.botApiKey) {
    res.status(503).json({ error: "Bot auth not configured" });
    return;
  }

  // Extract bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    recordFailure(ip);
    res.status(401).json({ error: "Missing bot authentication" });
    return;
  }

  const token = authHeader.slice(7);

  // Timing-safe comparison (S6)
  if (!timingSafeEqual(token, config.botApiKey)) {
    recordFailure(ip);
    res.status(401).json({ error: "Invalid bot authentication" });
    return;
  }

  // Verify route is in bot allowlist
  const path = req.originalUrl || req.path;
  const allowed = ALLOWED_BOT_ROUTES.some(prefix => path.startsWith(prefix));
  if (!allowed) {
    res.status(403).json({ error: "Route not accessible with bot auth" });
    return;
  }

  // Clear failed attempts on success
  failedAttempts.delete(ip);

  // Mark request as bot-authenticated
  (req as any).botAuthenticated = true;
  next();
}

/**
 * Timing-safe string comparison.
 * Pads shorter string to match length to prevent length-based timing leaks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Pad to same length to prevent length leak
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);

  return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const attempt = failedAttempts.get(ip);

  if (!attempt || (now - attempt.blockedUntil + BLOCK_DURATION_MS) > WINDOW_MS) {
    // New window or expired
    failedAttempts.set(ip, { count: 1, blockedUntil: 0 });
    return;
  }

  attempt.count++;
  if (attempt.count >= MAX_FAILURES) {
    attempt.blockedUntil = now + BLOCK_DURATION_MS;
    console.error(`[SECURITY] Bot auth: IP ${ip} blocked for 15 minutes after ${MAX_FAILURES} failed attempts`);
  }
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of failedAttempts) {
    if (attempt.blockedUntil > 0 && attempt.blockedUntil < now) {
      failedAttempts.delete(ip);
    }
  }
}, 30 * 60 * 1000).unref();
