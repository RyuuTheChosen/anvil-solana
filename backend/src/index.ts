import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { prisma } from "./db/client";
import launchRouter from "./api/launch";
import claimsRouter from "./api/claims";
import exploreRouter from "./api/explore";
import vaultRouter from "./api/vault";
import walletRouter from "./api/wallet";
import { startCleanupJobs } from "./jobs/cleanup";

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy (Railway reverse proxy)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

app.use(cors({
  origin: config.allowedOrigins,
  methods: ["GET", "POST", "DELETE"],
}));

// General rate limit: 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing with explicit size limits
app.use(express.json({ limit: "100kb" }));

// CSRF protection: require custom header on state-changing requests
// Bearer tokens (bot API key or Privy JWT) are not auto-sent by browsers, so they inherently prevent CSRF.
// We accept either the CSRF header or any Bearer token as proof this is not a browser-initiated CSRF attack.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const hasCSRF = req.headers["x-requested-with"] === "AnvilProtocol";
    const hasBearerToken = req.headers.authorization?.startsWith("Bearer ");
    if (!hasCSRF && !hasBearerToken) {
      res.status(403).json({ error: "Missing or invalid X-Requested-With header" });
      return;
    }
  }
  next();
});

// Routes
app.use("/api/launch", launchRouter);
app.use("/api/claims", claimsRouter);
app.use("/api/explore", exploreRouter);
app.use("/api/vault", vaultRouter);
app.use("/api/wallet", walletRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Global error handler — catches any errors that escape route try-catch blocks
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error-handler] Unhandled:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`[anvil] Backend running on http://localhost:${PORT}`);
  try {
    console.log(`[anvil] RPC: ${new URL(config.solanaRpcUrl).hostname}`);
  } catch {
    console.log(`[anvil] RPC: [configured]`);
  }
  startCleanupJobs();
});

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log(`[anvil] Shutting down (${signal})...`);
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default app;
