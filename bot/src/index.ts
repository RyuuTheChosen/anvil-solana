import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { prisma } from "./db";
import { log } from "./logger";
import { recoverIncompleteLaunches } from "./recovery";
import { startPoller, stopPoller } from "./twitter/poller";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bot", timestamp: Date.now() });
});

// Startup
async function main(): Promise<void> {
  log("main", "Starting bot service...");

  // Recover incomplete launches from previous run
  await recoverIncompleteLaunches();

  // Start polling for mentions
  startPoller();

  app.listen(config.port, () => {
    log("main", `Bot service running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("[bot:main] Fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    log("main", `Shutting down (${signal})...`);
    await stopPoller();
    await prisma.$disconnect();
    process.exit(0);
  });
}
