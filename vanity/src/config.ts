import dotenv from "dotenv";
dotenv.config();

export const config = {
  suffix: process.env.VANITY_SUFFIX || "nv1",
  minPoolSize: parseInt(process.env.MIN_POOL_SIZE || "20", 10),
  targetPoolSize: parseInt(process.env.TARGET_POOL_SIZE || "50", 10),
  grindBatchSize: parseInt(process.env.GRIND_BATCH_SIZE || "5", 10),
  staleClaimMaxAgeMs: parseInt(process.env.STALE_CLAIM_MAX_AGE_MS || String(2 * 60 * 60 * 1000), 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || String(5 * 60 * 1000), 10),
  cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || String(30 * 60 * 1000), 10),
  vaultMasterKey: process.env.VAULT_MASTER_KEY || "",
};

if (!config.vaultMasterKey) {
  throw new Error("VAULT_MASTER_KEY env var is required");
}

if (!/^[1-9A-HJ-NP-Za-km-z]{3,5}$/.test(config.suffix)) {
  throw new Error(`Invalid vanity suffix: ${config.suffix} (must be 3-5 valid base58 chars)`);
}
