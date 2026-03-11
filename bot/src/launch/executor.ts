import { prisma } from "../db";
import { log, error as logError } from "../logger";
import * as backend from "./backendClient";
import type { ParsedLaunch } from "../validate";

const MAX_LAUNCH_DURATION_MS = 120_000; // 2 minutes

export interface LaunchResult {
  success: boolean;
  mint?: string;
  txSignature?: string;
  configureTxSig?: string;
  error?: string;
}

interface LaunchMeta {
  creator: string;
  name: string;
  symbol: string;
  metadataUri: string;
  imageUrl?: string;
}

/**
 * Core 2-step launch orchestrator.
 * Updates BotLaunch.status atomically at each step for crash recovery.
 */
export async function executeLaunch(
  botLaunchId: string,
  xUserId: string,
  parsed: ParsedLaunch,
  imageBuffer: Buffer,
): Promise<LaunchResult> {
  const startTime = Date.now();

  function checkTimeout(): void {
    if (Date.now() - startTime > MAX_LAUNCH_DURATION_MS) {
      throw new Error("Launch timed out");
    }
  }

  async function updateStatus(status: string, extra?: Record<string, unknown>): Promise<void> {
    await prisma.botLaunch.update({
      where: { id: botLaunchId },
      data: { status, ...extra },
    });
  }

  try {
    // Step 0: Pre-checks
    const rateLimitRes = await backend.checkRateLimit(xUserId);
    if (!rateLimitRes.ok || !rateLimitRes.data.allowed) {
      await updateStatus("failed", { errorMessage: "Daily launch limit reached" });
      return { success: false, error: "daily launch limit reached" };
    }

    const balanceRes = await backend.getBalance(xUserId);
    if (!balanceRes.ok || !balanceRes.data.success) {
      await updateStatus("failed", { errorMessage: "Could not check balance" });
      return { success: false, error: "could not check balance" };
    }

    const balanceSol = balanceRes.data.balanceSol ?? 0;
    const neededSol = parsed.devBuySol + 0.03;
    if (balanceSol < neededSol) {
      const walletRes = await backend.getWallet(xUserId);
      const pubkey = walletRes.data.publicKey || "your wallet";
      await updateStatus("failed", { errorMessage: "Insufficient balance" });
      return { success: false, error: `not enough SOL. send at least ${neededSol.toFixed(2)} SOL to ${pubkey}` };
    }

    checkTimeout();

    // Step 1: Upload metadata
    await updateStatus("uploading");
    const uploadRes = await backend.uploadMetadata(imageBuffer, {
      name: parsed.name,
      symbol: parsed.symbol,
      description: parsed.description,
    });

    if (!uploadRes.ok || !uploadRes.data.success || !uploadRes.data.metadataUri) {
      await updateStatus("failed", { errorMessage: "Metadata upload failed" });
      return { success: false, error: "something went wrong" };
    }

    const meta: LaunchMeta = {
      creator: "", // will be set after getWallet
      name: parsed.name,
      symbol: parsed.symbol,
      metadataUri: uploadRes.data.metadataUri,
      imageUrl: uploadRes.data.imageUri,
    };

    // Get wallet public key for creator field
    const walletRes = await backend.getWallet(xUserId);
    if (!walletRes.ok || !walletRes.data.success || !walletRes.data.publicKey) {
      await updateStatus("failed", { errorMessage: "Wallet lookup failed" });
      return { success: false, error: "something went wrong" };
    }
    meta.creator = walletRes.data.publicKey;

    checkTimeout();

    // Step 2: Build TX
    await updateStatus("building");
    const buildRes = await backend.buildTx({
      creator: meta.creator,
      name: parsed.name,
      symbol: parsed.symbol,
      metadataUri: meta.metadataUri,
      devBuySol: parsed.devBuySol,
      maxHolders: parsed.maxHolders,
      holderSplitBps: parsed.holderSplitBps,
    });

    if (!buildRes.ok || !buildRes.data.success) {
      await updateStatus("failed", { errorMessage: "Build TX failed" });
      return { success: false, error: "something went wrong" };
    }

    if (buildRes.data.poolEmpty) {
      await updateStatus("failed", { errorMessage: "Vanity pool empty" });
      return { success: false, error: "temporarily unavailable. try again in a few minutes." };
    }

    const mint = buildRes.data.mint;
    const partiallySignedTx = buildRes.data.partiallySignedTx;

    if (!mint || !partiallySignedTx) {
      await updateStatus("failed", { errorMessage: "Missing mint or TX from build" });
      return { success: false, error: "something went wrong" };
    }

    await prisma.botLaunch.update({
      where: { id: botLaunchId },
      data: { tokenMint: mint },
    });

    checkTimeout();

    // Step 3: Sign & submit
    await updateStatus("signing");
    const signRes = await backend.signAndSubmit(xUserId, { serializedTx: partiallySignedTx });

    if (!signRes.ok || !signRes.data.success || !signRes.data.signature) {
      await updateStatus("failed", { errorMessage: "Sign and submit failed" });
      return { success: false, error: "transaction failed. try again." };
    }

    const txSignature = signRes.data.signature;
    await prisma.botLaunch.update({
      where: { id: botLaunchId },
      data: { txSignature },
    });

    checkTimeout();

    // Step 4: Confirm token creation (poll — TX needs time to land on-chain)
    await updateStatus("confirming");
    let confirmRes;
    for (let attempt = 0; attempt < 10; attempt++) {
      confirmRes = await backend.confirmTx(mint, txSignature, {
        creator: meta.creator,
        name: meta.name,
        symbol: meta.symbol,
        metadataUri: meta.metadataUri,
        imageUrl: meta.imageUrl,
      });

      if (confirmRes.ok && confirmRes.data.success) break;

      // "Transaction not confirmed" means TX hasn't landed yet — retry
      const errMsg = (confirmRes.data as any)?.error || "";
      if (errMsg === "Transaction not confirmed" && attempt < 9) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      break;
    }

    if (!confirmRes!.ok || !confirmRes!.data.success) {
      await updateStatus("failed", { errorMessage: "Token confirmation failed" });
      return { success: false, error: "transaction failed on-chain. try again." };
    }

    checkTimeout();

    // Step 5: Build configure (fee sharing + vault)
    await updateStatus("configuring");
    const configureRes = await backend.buildConfigure(mint, meta.creator);

    if (!configureRes.ok || !configureRes.data.success) {
      await updateStatus("failed", { errorMessage: "Build configure failed" });
      return { success: false, error: "something went wrong" };
    }

    if (configureRes.data.alreadyConfigured) {
      await updateStatus("complete", { completedAt: new Date() });
      log("executor", "Launch complete (already configured)", { mint });
      return { success: true, mint, txSignature, configureTxSig: txSignature };
    }

    checkTimeout();

    // Step 6: Sign & submit configure
    await updateStatus("config_signing");
    const instructionSet = configureRes.data.instructionSet;

    const configSignRes = await backend.signAndSubmit(xUserId, { instructionSet });

    if (!configSignRes.ok || !configSignRes.data.success || !configSignRes.data.signature) {
      await updateStatus("failed", { errorMessage: "Configure sign failed" });
      return { success: false, error: "something went wrong" };
    }

    const configureTxSig = configSignRes.data.signature;
    await prisma.botLaunch.update({
      where: { id: botLaunchId },
      data: { configureTxSig },
    });

    checkTimeout();

    // Step 7: Confirm configure (poll — TX needs time to land on-chain)
    await updateStatus("config_confirming");
    let confirmConfigRes;
    for (let attempt = 0; attempt < 10; attempt++) {
      confirmConfigRes = await backend.confirmConfigure(mint, configureTxSig);

      if (confirmConfigRes.ok && confirmConfigRes.data.success) break;

      const errMsg = (confirmConfigRes.data as any)?.error || "";
      if (errMsg === "Transaction not confirmed" && attempt < 9) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      break;
    }

    if (!confirmConfigRes!.ok || !confirmConfigRes!.data.success) {
      await updateStatus("failed", { errorMessage: "Configure confirmation failed" });
      return { success: false, error: "something went wrong" };
    }

    // Done!
    await updateStatus("complete", { completedAt: new Date() });
    log("executor", "Launch complete", { mint, symbol: parsed.symbol });
    return { success: true, mint, txSignature, configureTxSig };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logError("executor", "Launch failed", err);
    try {
      await updateStatus("failed", { errorMessage: message.slice(0, 500) });
    } catch {
      // DB update failed too — nothing we can do
    }
    return { success: false, error: message };
  }
}
