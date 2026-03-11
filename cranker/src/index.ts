import { POLL_INTERVAL_MS, VAULTS_PER_CYCLE } from "./config";
import { prisma } from "./db/client";
import { collectPumpFees } from "./services/feeCollector";
import { checkAndDepositFees } from "./services/vaultMonitor";
import { checkGraduation } from "./services/graduationWatcher";
import { trackHolders } from "./services/holderTracker";
import { applyPendingSplitChanges } from "./services/splitChangeApplier";
import { expireStaleAllocations } from "./services/expiryReclaimer";
import { submitDistributions } from "./services/distributionSubmitter";
import { pushDistributions } from "./services/distributionPusher";
import { deployOrAddLp } from "./services/lpDeployer";
import { harvestLpFees } from "./services/lpFeeHarvester";
import { executeBuybacks } from "./services/buybackExecutor";
import { confirmUnconfirmedVaults } from "./services/vaultConfirmer";
import { updateHealthFromResults } from "./utils/health";
import { isPlatformPaused } from "./utils/anchor";
import { startApiServer } from "./api/server";
import type { Vault } from "@prisma/client";
import type { StepResult } from "./utils/health";

let running = false;
let vaultCursor = 0;

/**
 * Select the next batch of vaults to process via round-robin.
 * If total vaults <= VAULTS_PER_CYCLE, process all every cycle.
 */
function getNextBatch(vaults: Vault[]): Vault[] {
  if (vaults.length === 0) return [];
  if (vaults.length <= VAULTS_PER_CYCLE) {
    vaultCursor = 0;
    return vaults;
  }

  // Wrap cursor if vault list shrank
  if (vaultCursor >= vaults.length) {
    vaultCursor = 0;
  }

  const batch: Vault[] = [];
  for (let i = 0; i < VAULTS_PER_CYCLE && i < vaults.length; i++) {
    batch.push(vaults[(vaultCursor + i) % vaults.length]);
  }
  vaultCursor = (vaultCursor + VAULTS_PER_CYCLE) % vaults.length;
  return batch;
}

async function runCycle(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const cycleStart = Date.now();

    // Fetch all active vaults once, then pick a batch for RPC-heavy steps
    // Skip vaults created < 2 min ago — RPC needs time to index new mints
    const warmupCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const allActive = await prisma.vault.findMany({
      where: { active: true, createdAt: { lt: warmupCutoff } },
    });
    const batch = getNextBatch(allActive);

    // Step 0: Auto-confirm any unconfirmed vaults (DB + RPC, runs on full set)
    const tc = Date.now();
    const confirmedCount = await confirmUnconfirmedVaults();
    if (confirmedCount > 0) {
      console.log(`[cranker] Auto-confirmed ${confirmedCount} vault(s) in ${Date.now() - tc}ms`);
    }

    if (batch.length === 0) {
      console.log(`[cranker] No active vaults, skipping cycle`);
      return;
    }

    const batchLabel = batch.map((v) => v.symbol || v.tokenMint.slice(0, 8)).join(", ");
    console.log(
      `[cranker] Cycle: ${batch.length}/${allActive.length} vaults [${batchLabel}]`
    );

    // Check if platform is paused on-chain before submitting TXs
    const paused = await isPlatformPaused();
    if (paused) {
      console.log(`[cranker] Platform is paused on-chain, skipping TX steps`);
    }

    // Step 1: Collect PumpFun creator fees into fee_account PDAs (RPC-heavy, batched)
    const t0 = Date.now();
    const collectResults = paused ? [] : await collectPumpFees(batch);
    console.log(`[cranker] PumpFun fee collection done in ${Date.now() - t0}ms`);

    // Step 2: Deposit fees from fee_account to vault_pool (RPC-heavy, batched)
    const t1 = Date.now();
    const depositResults: StepResult[] = paused ? [] : await checkAndDepositFees(batch);
    console.log(`[cranker] Deposits done in ${Date.now() - t1}ms`);

    // Step 3: Check for token graduations (RPC, batched)
    const t2 = Date.now();
    const gradResults = await checkGraduation(batch);
    console.log(`[cranker] Graduation check done in ${Date.now() - t2}ms`);

    // Step 4: Track top holders (RPC-heavy, batched)
    const t3 = Date.now();
    const holderResults = await trackHolders(batch);
    console.log(`[cranker] Holders tracked in ${Date.now() - t3}ms`);

    // Step 5: Apply pending time-locked split changes (DB-only, runs on full set)
    const t4 = Date.now();
    await applyPendingSplitChanges();
    console.log(`[cranker] Split changes applied in ${Date.now() - t4}ms`);

    // Step 6: Expire stale allocations from zero-balance holders (DB + RPC, batched)
    const t5a = Date.now();
    const expiryResults = await expireStaleAllocations(batch);
    console.log(`[cranker] Expiry check done in ${Date.now() - t5a}ms`);

    // Step 7: Submit distributions — split by mode (RPC-heavy, batched)
    const t5 = Date.now();
    let distResults: StepResult[] = [];
    if (!paused) {
      const pushVaults = batch.filter((v) => v.distributionMode === "push");
      const pullVaults = batch.filter((v) => v.distributionMode === "pull");
      const [pushResults, pullResults] = await Promise.all([
        pushVaults.length > 0 ? pushDistributions(pushVaults) : [],
        pullVaults.length > 0 ? submitDistributions(pullVaults) : [],
      ]);
      distResults = [...pushResults, ...pullResults];
    }
    console.log(`[cranker] Distributions done in ${Date.now() - t5}ms`);

    // Step 8: Deploy or add LP (own specialized query)
    const t6 = Date.now();
    if (!paused) await deployOrAddLp();
    console.log(`[cranker] LP deployment done in ${Date.now() - t6}ms`);

    // Step 9: Harvest LP fees (own specialized query)
    const t7 = Date.now();
    if (!paused) await harvestLpFees();
    console.log(`[cranker] LP harvest done in ${Date.now() - t7}ms`);

    // Step 10: Execute buybacks (own specialized query)
    const t8 = Date.now();
    if (!paused) await executeBuybacks();
    console.log(`[cranker] Buybacks done in ${Date.now() - t8}ms`);

    // Step 11: Update vault health based on RPC step results
    await updateHealthFromResults([collectResults, depositResults, gradResults, holderResults, expiryResults, distResults]);

    console.log(`[cranker] Cycle complete in ${Date.now() - cycleStart}ms`);
  } catch (err) {
    console.error("[cranker] Cycle error:", err);
  } finally {
    running = false;
  }
}

async function main(): Promise<void> {
  console.log("[cranker] Anvil Protocol Cranker starting...");
  console.log(`[cranker] Poll interval: ${POLL_INTERVAL_MS}ms, vaults/cycle: ${VAULTS_PER_CYCLE}`);

  // Start the proof API server
  startApiServer();

  // Run first cycle immediately
  await runCycle();

  // Schedule recurring cycles
  setInterval(runCycle, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[cranker] Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[cranker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[cranker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
