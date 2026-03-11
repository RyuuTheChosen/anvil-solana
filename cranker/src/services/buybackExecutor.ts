import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getAccount, createBurnInstruction } from "@solana/spl-token";
import {
  connection,
  crankerKeypair,
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
const MIN_BUYBACK_SWAP_LAMPORTS = 1_000_000n; // 0.001 SOL — below this, skip swap

export async function executeBuybacks(): Promise<void> {
  const vaults = await prisma.vault.findMany({
    where: {
      active: true,
      graduated: true,
      buybackEnabled: true,
      pendingBuybackSol: { gt: 0n },
    },
  });

  // Filter to vaults that meet their per-vault threshold
  const eligible = vaults.filter(
    (v) => v.pendingBuybackSol >= v.buybackThresholdSol
  );

  if (eligible.length === 0) return;

  await pMap(
    eligible,
    async (vault: Vault) => {
      try {
        await executeBuybackForVault(vault);
      } catch (err) {
        console.error(`[buyback] Error for ${vault.tokenMint}:`, err);
      }
    },
    VAULT_CONCURRENCY
  );
}

async function executeBuybackForVault(vault: Vault): Promise<void> {
  // Guard: skip if push distribution is in progress
  if (vault.distributionMode === "push") {
    const latestDist = await prisma.distributionRecord.findFirst({
      where: { vaultId: vault.id },
      orderBy: { epochNumber: "desc" },
    });
    if (latestDist && !latestDist.pushCompleted) {
      console.log(`[buyback] ${vault.tokenMint}: skipping — push in progress`);
      return;
    }
  }

  const mint = new PublicKey(vault.tokenMint);
  const pendingSol = vault.pendingBuybackSol;
  const cranker = crankerKeypair;

  if (pendingSol < MIN_BUYBACK_SWAP_LAMPORTS) {
    console.log(`[buyback] ${vault.tokenMint}: pendingBuybackSol too small (${pendingSol}), skipping`);
    return;
  }

  // Pre-flight: check cranker SOL balance
  const crankerBalance = await connection.getBalance(cranker.publicKey);
  if (BigInt(crankerBalance) < CRANKER_MIN_SOL) {
    console.log(`[buyback] Cranker SOL balance too low (${crankerBalance}), skipping`);
    return;
  }

  // Step 1: Verify PumpSwap pool exists
  const poolAddress = getCanonicalPoolAddress(mint);
  const pool = await fetchPoolOrNull(poolAddress);
  if (!pool) {
    console.log(`[buyback] ${vault.tokenMint}: PumpSwap pool not found, skipping`);
    return;
  }

  const txSignatures: string[] = [];

  // Step 2: Withdraw buyback SOL from vault_pool
  let withdrawTx: string;
  try {
    withdrawTx = await callWithdrawForLp(mint, pendingSol);
    txSignatures.push(withdrawTx);
    console.log(`[buyback] ${vault.tokenMint}: withdraw TX: ${withdrawTx}`);
  } catch (err) {
    console.error(`[buyback] ${vault.tokenMint}: withdraw failed:`, err);
    await prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "BUYBACK",
        solAmount: pendingSol,
        status: "FAILED",
        error: `withdraw failed: ${err instanceof Error ? err.message : String(err)}`,
        txSignatures: [],
      },
    });
    return;
  }

  // Zero out pendingBuybackSol immediately to prevent double-withdrawal
  await prisma.vault.update({
    where: { id: vault.id },
    data: { pendingBuybackSol: 0n },
  });

  // Step 3: Buy tokens via PumpSwap (SOL -> token)
  let tokensBought = 0n;
  try {
    const swapState = await onlinePumpAmmSdk.swapSolanaState(poolAddress, cranker.publicKey);
    const buyIxs = await pumpAmmSdk.buyQuoteInput(swapState, new BN(pendingSol.toString()), LP_SLIPPAGE);

    const extendIx = await buildExtendPoolIx(poolAddress, cranker.publicKey);

    const swapTx = new Transaction();
    if (extendIx) swapTx.add(extendIx);
    buyIxs.forEach((ix) => swapTx.add(ix));

    const swapSig = await sendAndConfirmTransaction(connection, swapTx, [cranker], {
      commitment: "confirmed",
    });
    txSignatures.push(swapSig);
    console.log(`[buyback] ${vault.tokenMint}: swap TX: ${swapSig}`);

    // Read how many tokens we got
    const { address: tokenAta } = await ensureAta(cranker.publicKey, mint);
    const tokenAccount = await getAccount(connection, tokenAta);
    tokensBought = tokenAccount.amount;
  } catch (err) {
    console.error(`[buyback] ${vault.tokenMint}: swap failed:`, err);
    // Cleanup WSOL
    try {
      const cleanupIx = await buildCloseWsolIx(cranker.publicKey);
      const cleanupTx = new Transaction().add(cleanupIx);
      await sendAndConfirmTransaction(connection, cleanupTx, [cranker], { commitment: "confirmed" });
    } catch { /* best-effort */ }

    await prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "BUYBACK",
        solAmount: pendingSol,
        status: "FAILED",
        error: `swap failed: ${err instanceof Error ? err.message : String(err)}`,
        txSignatures,
      },
    });
    return;
  }

  // Step 4: Close WSOL ATA cleanup
  try {
    const cleanupIx = await buildCloseWsolIx(cranker.publicKey);
    const cleanupTx = new Transaction().add(cleanupIx);
    await sendAndConfirmTransaction(connection, cleanupTx, [cranker], { commitment: "confirmed" });
  } catch {
    console.warn(`[buyback] ${vault.tokenMint}: WSOL cleanup failed (non-critical)`);
  }

  // Step 5: Execute action — burn or hold
  if (vault.buybackAction === "burn" && tokensBought > 0n) {
    try {
      const { address: tokenAta } = await ensureAta(cranker.publicKey, mint);
      const burnIx = createBurnInstruction(tokenAta, mint, cranker.publicKey, tokensBought);
      const burnTx = new Transaction().add(burnIx);
      const burnSig = await sendAndConfirmTransaction(connection, burnTx, [cranker], {
        commitment: "confirmed",
      });
      txSignatures.push(burnSig);
      console.log(`[buyback] ${vault.tokenMint}: burn TX: ${burnSig}, burned ${tokensBought} tokens`);
    } catch (err) {
      console.error(`[buyback] ${vault.tokenMint}: burn failed (tokens held instead):`, err);
      // Fall through to "hold" — tokens stay in cranker wallet
    }
  }

  // Step 6: Update DB atomically
  const isBurned = vault.buybackAction === "burn";
  await prisma.$transaction([
    prisma.vault.update({
      where: { id: vault.id },
      data: {
        pendingBuybackSol: 0n,
        totalBuybackSol: { increment: pendingSol },
        // Only track balance for "hold" action
        ...(!isBurned && tokensBought > 0n
          ? { buybackTokenBalance: { increment: tokensBought } }
          : {}),
      },
    }),
    prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "BUYBACK",
        solAmount: pendingSol,
        lpTokens: tokensBought,
        status: "SUCCESS",
        txSignatures,
      },
    }),
  ]);

  console.log(
    `[buyback] ${vault.tokenMint}: ${isBurned ? "burned" : "held"} ${tokensBought} tokens, spent ${pendingSol} lamports`
  );
}
