import { config } from "./config";
import { prisma } from "./db/client";
import { encryptSecretKey } from "./crypto";
import { grindKeypairs, verifyCliInstalled } from "./grinder";
import { getPoolSize, getPoolStats, unclaimStaleKeypairs } from "./pool";

let grinding = false;

async function fillPool(): Promise<void> {
  if (grinding) {
    console.log("[vanity] Grind already in progress, skipping");
    return;
  }

  const available = await getPoolSize(config.suffix);

  if (available >= config.minPoolSize) {
    console.log(`[vanity] Pool OK: ${available} available (min: ${config.minPoolSize})`);
    return;
  }

  grinding = true;
  try {
    const needed = config.targetPoolSize - available;
    const batchSize = Math.min(needed, config.grindBatchSize);
    console.log(`[vanity] Pool low (${available} < ${config.minPoolSize}), grinding ${batchSize}...`);

    const keypairs = await grindKeypairs(config.suffix, batchSize);
    let inserted = 0;

    for (const kp of keypairs) {
      try {
        const encrypted = encryptSecretKey(kp.secretKey);
        await prisma.vanityKeypair.create({
          data: {
            publicKey: kp.publicKey.toBase58(),
            encryptedKey: encrypted,
            suffix: config.suffix,
          },
        });
        inserted++;
      } catch (err: any) {
        // Skip duplicate keys (unique constraint on publicKey)
        if (err?.code === "P2002") {
          console.warn(`[vanity] Duplicate key skipped: ${kp.publicKey.toBase58().slice(0, 12)}...`);
        } else {
          console.error("[vanity] Failed to insert keypair:", err);
        }
      } finally {
        kp.secretKey.fill(0);
      }
    }

    console.log(`[vanity] Added ${inserted} keypairs to pool`);
  } catch (err) {
    console.error("[vanity] Grind error:", err);
  } finally {
    grinding = false;
  }
}

async function cleanStaleClaims(): Promise<void> {
  try {
    const count = await unclaimStaleKeypairs(config.staleClaimMaxAgeMs);
    if (count > 0) {
      console.log(`[vanity] Reclaimed ${count} stale keypair(s)`);
    }
  } catch (err) {
    console.error("[vanity] Cleanup error:", err);
  }
}

async function logStats(): Promise<void> {
  const stats = await getPoolStats(config.suffix);
  console.log(
    `[vanity] Pool stats: ${stats.available} available, ${stats.claimed} in-flight, ` +
    `${stats.confirmed} confirmed, ${stats.total} total`
  );
}

async function main(): Promise<void> {
  console.log("[vanity] Anvil Vanity Service starting...");
  console.log(`[vanity] Suffix: ${config.suffix}, target: ${config.targetPoolSize}, min: ${config.minPoolSize}`);
  console.log(`[vanity] Poll: ${config.pollIntervalMs / 1000}s, cleanup: ${config.cleanupIntervalMs / 1000}s`);

  await verifyCliInstalled();
  await logStats();

  // Initial fill
  await fillPool();

  // Schedule recurring tasks
  setInterval(() => { fillPool(); }, config.pollIntervalMs);
  setInterval(() => { cleanStaleClaims(); }, config.cleanupIntervalMs);
  // Log stats every poll cycle
  setInterval(() => { logStats(); }, config.pollIntervalMs);
}

main().catch((err) => {
  console.error("[vanity] Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("[vanity] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[vanity] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
