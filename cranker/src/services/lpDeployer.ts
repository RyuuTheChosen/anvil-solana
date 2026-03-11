import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getAccount } from "@solana/spl-token";
import {
  connection,
  crankerKeypair,
  MIN_LP_THRESHOLD_LAMPORTS,
  MIN_LP_SWAP_LAMPORTS,
  VAULT_CONCURRENCY,
} from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import { callWithdrawForLp } from "../utils/anchor";
import {
  pumpAmmSdk,
  onlinePumpAmmSdk,
  getCanonicalPoolAddress,
  fetchPoolOrNull,
  buildExtendPoolIx,
  ensureAta,
  buildCloseWsolIx,
  LP_SLIPPAGE,
} from "../utils/pumpswap";
import { pMap } from "../utils/concurrency";

const CRANKER_MIN_SOL = 50_000_000n; // 0.05 SOL minimum for TX fees

export async function deployOrAddLp(): Promise<void> {
  const vaults = await prisma.vault.findMany({
    where: {
      active: true,
      graduated: true,
      pendingLpSol: { gte: BigInt(MIN_LP_THRESHOLD_LAMPORTS) },
    },
  });

  if (vaults.length === 0) return;

  await pMap(
    vaults,
    async (vault: Vault) => {
      try {
        await deployLpForVault(vault);
      } catch (err) {
        console.error(`[lp-deploy] Error for ${vault.tokenMint}:`, err);
      }
    },
    VAULT_CONCURRENCY
  );
}

async function deployLpForVault(vault: Vault): Promise<void> {
  // Guard: skip if push distribution is in progress
  if (vault.distributionMode === "push") {
    const latestDist = await prisma.distributionRecord.findFirst({
      where: { vaultId: vault.id },
      orderBy: { epochNumber: "desc" },
    });
    if (latestDist && !latestDist.pushCompleted) {
      console.log(`[lp-deploy] ${vault.tokenMint}: skipping — push in progress`);
      return;
    }
  }

  const mint = new PublicKey(vault.tokenMint);
  const pendingSol = vault.pendingLpSol;
  const cranker = crankerKeypair;

  if (pendingSol < BigInt(MIN_LP_SWAP_LAMPORTS)) {
    console.log(`[lp-deploy] ${vault.tokenMint}: pendingLpSol too small (${pendingSol}), skipping`);
    return;
  }

  // Pre-flight: check cranker SOL balance
  const crankerBalance = await connection.getBalance(cranker.publicKey);
  if (BigInt(crankerBalance) < CRANKER_MIN_SOL) {
    console.log(`[lp-deploy] Cranker SOL balance too low (${crankerBalance}), skipping`);
    return;
  }

  // Step 1: Derive pool PDA and check it exists
  const poolAddress = getCanonicalPoolAddress(mint);
  const pool = await fetchPoolOrNull(poolAddress);
  if (!pool) {
    console.log(`[lp-deploy] ${vault.tokenMint}: PumpSwap pool not found, skipping`);
    return;
  }

  // Recovery: check if cranker already holds base tokens from a previous partial failure
  const { address: baseAta } = await ensureAta(cranker.publicKey, mint);
  let hasRecoveryTokens = false;
  try {
    const baseAccount = await getAccount(connection, baseAta);
    if (baseAccount.amount > 0n) {
      hasRecoveryTokens = true;
      console.log(`[lp-deploy] ${vault.tokenMint}: recovering from partial failure, cranker holds ${baseAccount.amount} base tokens`);
    }
  } catch {
    // ATA doesn't exist — normal path
  }

  const txSignatures: string[] = [];

  if (!hasRecoveryTokens) {
    // Step 2: Withdraw LP SOL from vault_pool via on-chain instruction
    let withdrawTx: string;
    try {
      withdrawTx = await callWithdrawForLp(mint, pendingSol);
      txSignatures.push(withdrawTx);
      console.log(`[lp-deploy] ${vault.tokenMint}: withdraw_for_lp TX: ${withdrawTx}`);
    } catch (err) {
      console.error(`[lp-deploy] ${vault.tokenMint}: withdraw_for_lp failed:`, err);
      await prisma.lpOperation.create({
        data: {
          vaultId: vault.id,
          type: "DEPLOY",
          solAmount: pendingSol,
          status: "FAILED",
          error: `withdraw_for_lp failed: ${err instanceof Error ? err.message : String(err)}`,
          txSignatures: [],
        },
      });
      return;
    }

    // Set pendingLpSol=0 immediately after successful withdrawal to prevent double-withdrawal
    await prisma.vault.update({
      where: { id: vault.id },
      data: { pendingLpSol: 0n },
    });

    // Step 3: Buy base tokens with ~49% of SOL
    const halfSol = (pendingSol * 49n) / 100n;
    if (halfSol < BigInt(MIN_LP_SWAP_LAMPORTS)) {
      console.log(`[lp-deploy] ${vault.tokenMint}: half SOL too small for swap, skipping`);
      await prisma.lpOperation.create({
        data: {
          vaultId: vault.id,
          type: "DEPLOY",
          solAmount: pendingSol,
          status: "FAILED",
          error: "Half SOL amount too small for swap",
          txSignatures,
        },
      });
      return;
    }

    try {
      // Build swap state and buy instructions via SDK
      // buyQuoteInput: spend SOL (quote) to buy base tokens
      const swapState = await onlinePumpAmmSdk.swapSolanaState(poolAddress, cranker.publicKey);
      const buyIxs = await pumpAmmSdk.buyQuoteInput(swapState, new BN(halfSol.toString()), LP_SLIPPAGE);

      const extendIx = await buildExtendPoolIx(poolAddress, cranker.publicKey);

      const swapTx = new Transaction();
      if (extendIx) swapTx.add(extendIx);
      buyIxs.forEach((ix) => swapTx.add(ix));

      const swapSig = await sendAndConfirmTransaction(connection, swapTx, [cranker], {
        commitment: "confirmed",
      });
      txSignatures.push(swapSig);
      console.log(`[lp-deploy] ${vault.tokenMint}: swap TX: ${swapSig}`);
    } catch (err) {
      console.error(`[lp-deploy] ${vault.tokenMint}: swap failed:`, err);
      // Cleanup: close WSOL ATA to recover SOL
      try {
        const cleanupIx = await buildCloseWsolIx(cranker.publicKey);
        const cleanupTx = new Transaction().add(cleanupIx);
        await sendAndConfirmTransaction(connection, cleanupTx, [cranker], { commitment: "confirmed" });
      } catch { /* best-effort */ }

      await prisma.lpOperation.create({
        data: {
          vaultId: vault.id,
          type: "DEPLOY",
          solAmount: pendingSol,
          status: "FAILED",
          error: `swap failed: ${err instanceof Error ? err.message : String(err)}`,
          txSignatures,
        },
      });
      return;
    }
  }

  // Step 4: Deposit base tokens + SOL as LP
  try {
    const { address: tokenAta } = await ensureAta(cranker.publicKey, mint);
    const baseAccount = await getAccount(connection, tokenAta);
    const baseBalance = baseAccount.amount;

    if (baseBalance === 0n) {
      console.log(`[lp-deploy] ${vault.tokenMint}: no base tokens to deposit, skipping`);
      await prisma.lpOperation.create({
        data: {
          vaultId: vault.id,
          type: "DEPLOY",
          solAmount: pendingSol,
          status: "FAILED",
          error: "No base tokens available for deposit",
          txSignatures,
        },
      });
      return;
    }

    // Build liquidity state via OnlinePumpAmmSdk
    const liqState = await onlinePumpAmmSdk.liquiditySolanaState(poolAddress, cranker.publicKey);

    // Calculate deposit quote from base token amount
    const depositQuote = pumpAmmSdk.depositAutocompleteQuoteAndLpTokenFromBase(
      liqState,
      new BN(baseBalance.toString()),
      LP_SLIPPAGE
    );

    // Build deposit instructions
    const depositIxs = await pumpAmmSdk.depositInstructions(
      liqState,
      depositQuote.lpToken,
      LP_SLIPPAGE
    );

    const depositTx = new Transaction();
    depositIxs.forEach((ix) => depositTx.add(ix));

    const depositSig = await sendAndConfirmTransaction(connection, depositTx, [cranker], {
      commitment: "confirmed",
    });
    txSignatures.push(depositSig);
    console.log(`[lp-deploy] ${vault.tokenMint}: deposit TX: ${depositSig}`);
  } catch (err) {
    console.error(`[lp-deploy] ${vault.tokenMint}: deposit failed (PARTIAL):`, err);
    await prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "DEPLOY",
        solAmount: pendingSol,
        status: "PARTIAL",
        error: `deposit failed: ${err instanceof Error ? err.message : String(err)}`,
        txSignatures,
      },
    });
    return;
  }

  // Step 5: Close WSOL ATA cleanup
  try {
    const cleanupIx = await buildCloseWsolIx(cranker.publicKey);
    const cleanupTx = new Transaction().add(cleanupIx);
    await sendAndConfirmTransaction(connection, cleanupTx, [cranker], { commitment: "confirmed" });
  } catch {
    console.warn(`[lp-deploy] ${vault.tokenMint}: WSOL cleanup failed (non-critical)`);
  }

  // Step 6: Read LP token balance from on-chain (source of truth)
  const lpMint = pool.lpMint as PublicKey;
  let lpTokenBalance = 0n;
  try {
    const { address: lpAta } = await ensureAta(cranker.publicKey, lpMint);
    const lpAccount = await getAccount(connection, lpAta);
    lpTokenBalance = lpAccount.amount;
  } catch {
    console.warn(`[lp-deploy] ${vault.tokenMint}: couldn't read LP token balance`);
  }

  // Step 7: Update DB atomically
  await prisma.$transaction([
    prisma.vault.update({
      where: { id: vault.id },
      data: {
        lpDeployed: true,
        lpPoolKey: poolAddress.toBase58(),
        lpSolDeposited: { increment: pendingSol },
        lpTokenBalance,
        lpDepositedValue: { increment: pendingSol },
        pendingLpSol: 0n,
        lastSweepAt: new Date(),
      },
    }),
    prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "DEPLOY",
        solAmount: pendingSol,
        lpTokens: lpTokenBalance,
        status: "SUCCESS",
        txSignatures,
      },
    }),
  ]);

  console.log(
    `[lp-deploy] ${vault.tokenMint}: LP deployed, ${pendingSol} lamports, ${lpTokenBalance} LP tokens`
  );
}
