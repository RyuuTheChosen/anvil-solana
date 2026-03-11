import { prisma } from "./db";
import { log, warn, error as logError } from "./logger";
import * as backend from "./launch/backendClient";

/**
 * Scan incomplete BotLaunch records on startup and resolve them.
 * Runs once before the poller starts.
 */
export async function recoverIncompleteLaunches(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const incomplete = await prisma.botLaunch.findMany({
    where: {
      status: { notIn: ["complete", "failed"] },
      createdAt: { gt: oneHourAgo },
    },
    include: { wallet: true },
  });

  if (incomplete.length === 0) {
    log("recovery", "No incomplete launches to recover");
    return;
  }

  log("recovery", `Found ${incomplete.length} incomplete launches`);

  for (const launch of incomplete) {
    try {
      await recoverLaunch(launch);
    } catch (err) {
      logError("recovery", `Failed to recover launch ${launch.id}`, err);
      await prisma.botLaunch.update({
        where: { id: launch.id },
        data: { status: "failed", errorMessage: "Recovery failed" },
      });
    }
  }
}

async function recoverLaunch(launch: {
  id: string;
  status: string;
  tokenMint: string | null;
  txSignature: string | null;
  configureTxSig: string | null;
  wallet: { xUserId: string; publicKey: string };
}): Promise<void> {
  const { id, status, tokenMint, txSignature, wallet } = launch;

  log("recovery", `Recovering launch ${id}`, { status, mint: tokenMint });

  // Early stages — can't recover, mark failed
  if (["parsing", "uploading", "building"].includes(status)) {
    await prisma.botLaunch.update({
      where: { id },
      data: { status: "failed", errorMessage: "Bot restarted during early stage" },
    });
    return;
  }

  // Signing stage with TX signature — check if TX confirmed
  if ((status === "signing" || status === "confirming") && txSignature && tokenMint) {
    const confirmRes = await backend.confirmTx(tokenMint, txSignature, {
      creator: wallet.publicKey,
      name: launch.tokenMint || "",
      symbol: "",
      metadataUri: "",
    });

    if (confirmRes.ok && confirmRes.data.success) {
      log("recovery", `TX confirmed, proceeding to configure`, { mint: tokenMint });
      // Try to configure
      await attemptConfigure(id, tokenMint, wallet.xUserId, wallet.publicKey);
      return;
    }

    // TX not confirmed — mark failed
    await prisma.botLaunch.update({
      where: { id },
      data: { status: "failed", errorMessage: "TX not confirmed after restart" },
    });
    return;
  }

  // Configure stages
  if (["configuring", "config_signing", "config_confirming"].includes(status) && tokenMint) {
    await attemptConfigure(id, tokenMint, wallet.xUserId, wallet.publicKey);
    return;
  }

  // Fallback — mark failed
  await prisma.botLaunch.update({
    where: { id },
    data: { status: "failed", errorMessage: "Unrecoverable state after restart" },
  });
}

async function attemptConfigure(
  launchId: string,
  mint: string,
  xUserId: string,
  creator: string,
): Promise<void> {
  const configureRes = await backend.buildConfigure(mint, creator);

  if (configureRes.ok && configureRes.data.alreadyConfigured) {
    await prisma.botLaunch.update({
      where: { id: launchId },
      data: { status: "complete", completedAt: new Date() },
    });
    log("recovery", "Already configured, marked complete", { mint });
    return;
  }

  if (!configureRes.ok || !configureRes.data.success) {
    await prisma.botLaunch.update({
      where: { id: launchId },
      data: { status: "failed", errorMessage: "Configure rebuild failed" },
    });
    return;
  }

  // Sign and submit configure
  const instructionSet = configureRes.data.instructionSet;

  const signRes = await backend.signAndSubmit(xUserId, { instructionSet });

  if (!signRes.ok || !signRes.data.success || !signRes.data.signature) {
    await prisma.botLaunch.update({
      where: { id: launchId },
      data: { status: "failed", errorMessage: "Configure sign failed during recovery" },
    });
    return;
  }

  // Confirm configure
  const confirmRes = await backend.confirmConfigure(mint, signRes.data.signature);

  if (confirmRes.ok && confirmRes.data.success) {
    await prisma.botLaunch.update({
      where: { id: launchId },
      data: {
        status: "complete",
        configureTxSig: signRes.data.signature,
        completedAt: new Date(),
      },
    });
    log("recovery", "Recovery complete", { mint });
  } else {
    await prisma.botLaunch.update({
      where: { id: launchId },
      data: { status: "failed", errorMessage: "Configure confirm failed during recovery" },
    });
  }
}
