import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { API_PORT } from "../config";
import claimsRouter from "./routes/claims";
import distributionsRouter from "./routes/distributions";
import vaultsRouter from "./routes/vaults";
import statsRouter from "./routes/stats";

export function startApiServer(): void {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  if (!process.env.REGISTER_API_KEY) {
    console.warn("[api] WARNING: REGISTER_API_KEY not set — vault registration will reject all requests");
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/claims", claimsRouter);
  app.use("/api/distributions", distributionsRouter);
  app.use("/api/vaults", vaultsRouter);
  app.use("/api/stats", statsRouter);

  app.listen(API_PORT, () => {
    console.log(`[api] Cranker API listening on port ${API_PORT}`);
  });
}
