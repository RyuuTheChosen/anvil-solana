import {
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getAccount } from "@solana/spl-token";
import {
  sellBaseInput as sellBaseInputQuote,
} from "@pump-fun/pump-swap-sdk";
import {
  connection,
  crankerKeypair,
  VAULT_CONCURRENCY,
  LP_REVENUE_SPLIT_HOLDER_BPS,
  MIN_HARVEST_THRESHOLD_LAMPORTS,
  LP_HARVEST_INTERVAL_MS,
  MIN_LP_SWAP_LAMPORTS,
} from "../config";
import type { Vault } from "@prisma/client";
import { prisma } from "../db/client";
import { deriveVaultPoolPda } from "../utils/anchor";
import {
  pumpAmmSdk,
  onlinePumpAmmSdk,
  getCanonicalPoolAddress,
  fetchPoolOrNull,
  ensureAta,
  buildCloseWsolIx,
  LP_SLIPPAGE,
} from "../utils/pumpswap";
import { pMap } from "../utils/concurrency";

const CRANKER_MIN_SOL = 50_000_000n; // 0.05 SOL minimum for TX fees

export async function harvestLpFees(): Promise<void> {
  const vaults = await prisma.vault.findMany({
    where: {
      active: true,
      lpDeployed: true,
      lpTokenBalance: { gt: 0n },
    },
  });

  if (vaults.length === 0) return;

  await pMap(
    vaults,
    async (vault: Vault) => {
      try {
        await harvestForVault(vault);
      } catch (err) {
        console.error(`[lp-harvest] Error for ${vault.tokenMint}:`, err);
      }
    },
    VAULT_CONCURRENCY
  );
}

async function harvestForVault(vault: Vault): Promise<void> {
  const mint = new PublicKey(vault.tokenMint);
  const cranker = crankerKeypair;

  // Step 1: Check harvest interval
  if (vault.lastSweepAt) {
    const timeSinceLastSweep = Date.now() - vault.lastSweepAt.getTime();
    if (timeSinceLastSweep < LP_HARVEST_INTERVAL_MS) return;
  }

  // Pre-flight: check cranker SOL balance
  const crankerBalance = await connection.getBalance(cranker.publicKey);
  if (BigInt(crankerBalance) < CRANKER_MIN_SOL) {
    console.log(`[lp-harvest] Cranker SOL balance too low (${crankerBalance}), skipping`);
    return;
  }

  // Step 2: Fetch pool
  const poolAddress = getCanonicalPoolAddress(mint);
  const pool = await fetchPoolOrNull(poolAddress);
  if (!pool) {
    console.warn(`[lp-harvest] ${vault.tokenMint}: pool not found`);
    return;
  }

  // Step 3: Self-heal LP token balance from on-chain
  const lpMint = pool.lpMint as PublicKey;
  let onChainLpBalance = 0n;
  try {
    const { address: lpAta } = await ensureAta(cranker.publicKey, lpMint);
    const lpAccount = await getAccount(connection, lpAta);
    onChainLpBalance = lpAccount.amount;
  } catch {
    // LP ATA doesn't exist — balance is 0
  }

  if (onChainLpBalance !== vault.lpTokenBalance) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { lpTokenBalance: onChainLpBalance },
    });
  }

  if (onChainLpBalance === 0n) return;

  // Step 4: Estimate current LP position value
  const liqState = await onlinePumpAmmSdk.liquiditySolanaState(poolAddress, cranker.publicKey);
  const withdrawEstimate = pumpAmmSdk.withdrawAutoCompleteBaseAndQuoteFromLpToken(
    liqState,
    new BN(onChainLpBalance.toString()),
    LP_SLIPPAGE
  );

  const currentQuoteValue = BigInt(withdrawEstimate.quote.toString());
  const baseAmount = BigInt(withdrawEstimate.base.toString());

  // Estimate base -> SOL value via swap state for quote calculation
  let estimatedBaseInSol = 0n;
  if (baseAmount > 0n) {
    try {
      const swapState = await onlinePumpAmmSdk.swapSolanaState(poolAddress, cranker.publicKey);
      // Use standalone sellBaseInput for quote estimation (doesn't build TXs)
      const sellEstimate = sellBaseInputQuote({
        base: new BN(baseAmount.toString()),
        slippage: LP_SLIPPAGE,
        baseReserve: swapState.poolBaseAmount,
        quoteReserve: swapState.poolQuoteAmount,
        globalConfig: swapState.globalConfig,
        baseMintAccount: swapState.baseMintAccount,
        baseMint: swapState.baseMint,
        coinCreator: (pool as any).coinCreator ?? swapState.baseMint,
        creator: (pool as any).creator ?? swapState.baseMint,
        feeConfig: swapState.feeConfig,
      });
      estimatedBaseInSol = BigInt(sellEstimate.uiQuote.toString());
    } catch {
      // Conservative: use 0 if estimation fails
    }
  }

  const totalSolValue = currentQuoteValue + estimatedBaseInSol;

  // Step 5: Calculate profit
  const profit = totalSolValue - vault.lpDepositedValue;
  if (profit <= BigInt(MIN_HARVEST_THRESHOLD_LAMPORTS)) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { lastSweepAt: new Date() },
    });
    return;
  }

  console.log(
    `[lp-harvest] ${vault.tokenMint}: profit ${profit} lamports (value: ${totalSolValue}, cost: ${vault.lpDepositedValue})`
  );

  // Step 6: Calculate LP tokens representing profit
  let profitLpTokens = totalSolValue > 0n
    ? (onChainLpBalance * profit) / totalSolValue
    : 0n;
  if (profitLpTokens > onChainLpBalance) profitLpTokens = onChainLpBalance;
  if (profitLpTokens < 1n) {
    await prisma.vault.update({
      where: { id: vault.id },
      data: { lastSweepAt: new Date() },
    });
    return;
  }

  const txSignatures: string[] = [];
  const solBefore = BigInt(await connection.getBalance(cranker.publicKey));

  // Step 7: Withdraw profit portion of LP
  try {
    const freshLiqState = await onlinePumpAmmSdk.liquiditySolanaState(poolAddress, cranker.publicKey);
    const withdrawIxs = await pumpAmmSdk.withdrawInstructions(
      freshLiqState,
      new BN(profitLpTokens.toString()),
      LP_SLIPPAGE
    );

    const withdrawTx = new Transaction();
    withdrawIxs.forEach((ix) => withdrawTx.add(ix));

    const withdrawSig = await sendAndConfirmTransaction(connection, withdrawTx, [cranker], {
      commitment: "confirmed",
    });
    txSignatures.push(withdrawSig);
    console.log(`[lp-harvest] ${vault.tokenMint}: withdraw TX: ${withdrawSig}`);
  } catch (err) {
    console.error(`[lp-harvest] ${vault.tokenMint}: LP withdraw failed:`, err);
    await prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "HARVEST",
        solAmount: profit,
        lpTokens: profitLpTokens,
        status: "FAILED",
        error: `withdraw failed: ${err instanceof Error ? err.message : String(err)}`,
        txSignatures,
      },
    });
    return;
  }

  // Step 8: Sell received base tokens -> SOL
  try {
    const { address: tokenAta } = await ensureAta(cranker.publicKey, mint);
    const baseAccount = await getAccount(connection, tokenAta);
    const baseReceived = baseAccount.amount;

    if (baseReceived > BigInt(MIN_LP_SWAP_LAMPORTS)) {
      // sellBaseInput builds TXs: sell base tokens for SOL (quote)
      const swapState = await onlinePumpAmmSdk.swapSolanaState(poolAddress, cranker.publicKey);
      const sellIxs = await pumpAmmSdk.sellBaseInput(swapState, new BN(baseReceived.toString()), LP_SLIPPAGE);

      const sellTx = new Transaction();
      sellIxs.forEach((ix) => sellTx.add(ix));

      const sellSig = await sendAndConfirmTransaction(connection, sellTx, [cranker], {
        commitment: "confirmed",
      });
      txSignatures.push(sellSig);
      console.log(`[lp-harvest] ${vault.tokenMint}: sell TX: ${sellSig}`);
    }
  } catch (err) {
    console.error(`[lp-harvest] ${vault.tokenMint}: sell base tokens failed:`, err);
  }

  // Close WSOL ATA if open
  try {
    const cleanupIx = await buildCloseWsolIx(cranker.publicKey);
    const cleanupTx = new Transaction().add(cleanupIx);
    await sendAndConfirmTransaction(connection, cleanupTx, [cranker], { commitment: "confirmed" });
  } catch { /* best-effort */ }

  // Step 9: Calculate realized SOL and re-split
  const solAfter = BigInt(await connection.getBalance(cranker.publicKey));
  const realizedSol = solAfter > solBefore ? solAfter - solBefore : 0n;

  const holderPortion = (realizedSol * BigInt(LP_REVENUE_SPLIT_HOLDER_BPS)) / 10000n;
  const compoundPortion = realizedSol - holderPortion;

  // Step 10: Deposit holder portion back to vault_pool
  if (holderPortion > 0n) {
    try {
      const [vaultPool] = deriveVaultPoolPda(mint);
      const depositTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: cranker.publicKey,
          toPubkey: vaultPool,
          lamports: holderPortion,
        })
      );
      const depositSig = await sendAndConfirmTransaction(connection, depositTx, [cranker], {
        commitment: "confirmed",
      });
      txSignatures.push(depositSig);
      console.log(`[lp-harvest] ${vault.tokenMint}: deposited ${holderPortion} to vault_pool: ${depositSig}`);
    } catch (err) {
      console.error(`[lp-harvest] ${vault.tokenMint}: vault_pool deposit failed:`, err);
    }
  }

  // Step 11: Read fresh LP token balance from on-chain
  let newLpBalance = onChainLpBalance;
  try {
    const { address: lpAta } = await ensureAta(cranker.publicKey, lpMint);
    const lpAccount = await getAccount(connection, lpAta);
    newLpBalance = lpAccount.amount;
  } catch { /* use estimated value */ }

  // Recalculate cost basis proportionally
  const remainingLpTokens = newLpBalance;
  const newCostBasis = onChainLpBalance > 0n
    ? (vault.lpDepositedValue * remainingLpTokens) / onChainLpBalance
    : 0n;

  // Step 12: Update DB atomically
  await prisma.$transaction([
    prisma.vault.update({
      where: { id: vault.id },
      data: {
        lpTokenBalance: newLpBalance,
        lpDepositedValue: newCostBasis,
        pendingLpSol: { increment: compoundPortion },
        lastSweepAt: new Date(),
      },
    }),
    prisma.lpOperation.create({
      data: {
        vaultId: vault.id,
        type: "HARVEST",
        solAmount: realizedSol,
        lpTokens: profitLpTokens,
        status: "SUCCESS",
        txSignatures,
      },
    }),
  ]);

  console.log(
    `[lp-harvest] ${vault.tokenMint}: harvested ${realizedSol} lamports (holder: ${holderPortion}, compound: ${compoundPortion})`
  );
}
