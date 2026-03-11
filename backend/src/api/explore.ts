import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { feeSharingConfigPda } from "@pump-fun/pump-sdk";
import { prisma } from "../db/client";
import { crankerGet } from "../lib/crankerClient";
import { parsePubkey } from "../lib/validate";
import { getConnection } from "../config/solana";
import { deriveVaultPda } from "../config/anvil";
import { requireWalletAuth } from "../middleware/walletAuth";
import { adminLimit, readLimit } from "../middleware/rateLimits";

const router = Router();

/**
 * GET /api/explore/tokens
 * Returns all active vaults with metadata and distribution stats.
 * Reads directly from the shared PostgreSQL database.
 */
router.get("/tokens", readLimit, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 24, 1), 100);
    const cursor = parseInt(req.query.cursor as string) || undefined;

    const vaults = await prisma.vault.findMany({
      where: { active: true, feeSharingConfirmed: true },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      orderBy: { id: "desc" },
      include: {
        _count: { select: { holders: { where: { balance: { gt: 0 } } } } },
        distributions: {
          orderBy: { epochNumber: "desc" },
          take: 1,
          select: {
            totalAllocated: true,
            epochNumber: true,
            holderCount: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = vaults.length > limit;
    const page = hasMore ? vaults.slice(0, limit) : vaults;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const tokens = page.map((v) => {
      const latestDist = v.distributions[0];
      return {
        mint: v.tokenMint,
        bondingCurve: v.bondingCurve || null,
        name: v.name || "Unknown",
        symbol: v.symbol || "???",
        imageUrl: v.imageUrl || null,
        creator: v.creator,
        holderCount: v._count.holders,
        maxHolders: v.maxHolders,
        totalDistributed: latestDist?.totalAllocated?.toString() ?? "0",
        epochCount: latestDist?.epochNumber ?? 0,
        lastDistributionAt: latestDist?.createdAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
      };
    });

    res.json({ tokens, nextCursor });
  } catch (err: any) {
    console.error("[explore/tokens] Error:", err);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

/**
 * GET /api/explore/vault/:mint
 * Returns metadata for a single vault.
 */
router.get("/vault/:mint", readLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const vault = await prisma.vault.findUnique({
      where: { tokenMint: req.params.mint },
      select: { tokenMint: true, bondingCurve: true, name: true, symbol: true, imageUrl: true, creator: true, maxHolders: true },
    });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }
    res.json({
      mint: vault.tokenMint,
      bondingCurve: vault.bondingCurve || null,
      name: vault.name || "Unknown",
      symbol: vault.symbol || "???",
      imageUrl: vault.imageUrl || null,
      creator: vault.creator,
      maxHolders: vault.maxHolders,
    });
  } catch (err: any) {
    console.error("[explore/vault] Error:", err);
    res.status(500).json({ error: "Failed to fetch vault metadata" });
  }
});

/**
 * GET /api/explore/vault/:mint/analytics
 * Returns full distribution history for charts: revenue, holder count, per-epoch amounts.
 */
router.get("/vault/:mint/analytics", readLimit, async (req: Request<{ mint: string }>, res: Response) => {
  try {
    const vault = await prisma.vault.findUnique({
      where: { tokenMint: req.params.mint },
      select: {
        id: true, name: true, symbol: true, imageUrl: true, creator: true, createdAt: true,
        graduated: true, graduatedAt: true, lpDeployed: true, lpPoolKey: true,
        lpSolDeposited: true, lpTokenBalance: true, lpDepositedValue: true,
        pendingLpSol: true, totalPlatformFees: true, holderSplitBps: true, platformFeeBps: true,
      },
    });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const [distributions, lpOperations] = await Promise.all([
      prisma.distributionRecord.findMany({
        where: { vaultId: vault.id },
        orderBy: { epochNumber: "asc" },
        select: {
          epochNumber: true,
          totalAllocated: true,
          holderCount: true,
          createdAt: true,
          txSignature: true,
        },
      }),
      prisma.lpOperation.findMany({
        where: { vaultId: vault.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const epochs = distributions.map((d, i) => {
      const prevAllocated = i > 0 ? distributions[i - 1].totalAllocated : 0n;
      return {
        epoch: d.epochNumber,
        totalAllocated: d.totalAllocated.toString(),
        epochAmount: (d.totalAllocated - prevAllocated).toString(),
        holderCount: d.holderCount,
        createdAt: d.createdAt.toISOString(),
        txSignature: d.txSignature || null,
      };
    });

    res.json({
      mint: req.params.mint,
      name: vault.name || "Unknown",
      symbol: vault.symbol || "???",
      imageUrl: vault.imageUrl || null,
      creator: vault.creator,
      vaultCreatedAt: vault.createdAt.toISOString(),
      epochs,
      lp: {
        graduated: vault.graduated,
        graduatedAt: vault.graduatedAt?.toISOString() ?? null,
        lpDeployed: vault.lpDeployed,
        lpPoolKey: vault.lpPoolKey,
        totalLpSolDeposited: vault.lpSolDeposited.toString(),
        currentLpTokenBalance: vault.lpTokenBalance.toString(),
        lpDepositedCostBasis: vault.lpDepositedValue.toString(),
        pendingLpSol: vault.pendingLpSol.toString(),
        totalPlatformFees: vault.totalPlatformFees.toString(),
        holderSplitBps: vault.holderSplitBps,
        platformFeeBps: vault.platformFeeBps,
        operations: lpOperations.map((op) => ({
          type: op.type,
          solAmount: op.solAmount.toString(),
          lpTokens: op.lpTokens.toString(),
          status: op.status,
          txSignatures: op.txSignatures,
          createdAt: op.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("[explore/vault/analytics] Error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * GET /api/explore/created/:wallet
 * Returns all vaults created by the given wallet address.
 */
router.get("/created/:wallet", readLimit, async (req: Request<{ wallet: string }>, res: Response) => {
  try {
    if (!parsePubkey(req.params.wallet)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const vaults = await prisma.vault.findMany({
      where: { creator: req.params.wallet, vaultCreated: true },
      orderBy: { createdAt: "desc" },
      select: {
        tokenMint: true,
        name: true,
        symbol: true,
        imageUrl: true,
        active: true,
        vaultCreated: true,
        feeSharingConfirmed: true,
        holderSplitBps: true,
        closeRequestedAt: true,
      },
    });

    res.json({
      vaults: vaults.map((v) => ({
        tokenMint: v.tokenMint,
        name: v.name,
        symbol: v.symbol,
        imageUrl: v.imageUrl,
        active: v.active,
        vaultCreated: v.vaultCreated,
        feeSharingConfirmed: v.feeSharingConfirmed,
        holderSplitBps: v.holderSplitBps,
        closeRequestedAt: v.closeRequestedAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    console.error("[explore/created] Error:", err);
    res.status(500).json({ error: "Failed to fetch created vaults" });
  }
});

/**
 * GET /api/explore/stats
 * Proxies to cranker /api/stats for landing page stats.
 */
router.get("/stats", readLimit, async (_req: Request, res: Response) => {
  try {
    const result = await crankerGet("/api/stats");
    if (!result.ok) {
      res.status(result.status).json(result.data);
      return;
    }
    res.json(result.data);
  } catch (err: any) {
    console.error("[explore/stats] Cranker unreachable:", err.message);
    res.status(502).json({ error: "Stats service unavailable" });
  }
});

/**
 * GET /api/explore/vault-health
 * Returns all vaults with health tracking fields for admin dashboard.
 * Includes active, paused, and erroring vaults.
 */
router.get("/vault-health", requireWalletAuth, adminLimit, async (_req: Request, res: Response) => {
  try {
    const vaults = await prisma.vault.findMany({
      orderBy: [
        { active: "asc" },           // paused vaults first
        { consecutiveFailures: "desc" }, // most failures first
        { id: "desc" },
      ],
      select: {
        id: true,
        tokenMint: true,
        name: true,
        symbol: true,
        active: true,
        vaultCreated: true,
        feeSharingConfirmed: true,
        consecutiveFailures: true,
        lastErrorType: true,
        pausedAt: true,
        pauseReason: true,
        createdAt: true,
      },
    });

    const summary = {
      total: vaults.length,
      active: vaults.filter((v) => v.active).length,
      paused: vaults.filter((v) => !v.active && v.pauseReason).length,
      erroring: vaults.filter((v) => v.active && v.consecutiveFailures > 0).length,
    };

    res.json({
      summary,
      vaults: vaults.map((v) => ({
        id: v.id,
        mint: v.tokenMint,
        name: v.name || "Unknown",
        symbol: v.symbol || "???",
        active: v.active,
        vaultCreated: v.vaultCreated,
        feeSharingConfirmed: v.feeSharingConfirmed,
        consecutiveFailures: v.consecutiveFailures,
        lastErrorType: v.lastErrorType,
        pausedAt: v.pausedAt?.toISOString() ?? null,
        pauseReason: v.pauseReason,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("[explore/vault-health] Error:", err);
    res.status(500).json({ error: "Failed to fetch vault health" });
  }
});

/**
 * Atomically toggle a vault's active state.
 * Uses updateMany with a condition on current `active` value to avoid TOCTOU races.
 * Returns { success, alreadyDone } or throws.
 */
async function setVaultActive(
  mint: string,
  active: boolean
): Promise<{ matched: boolean; alreadyDone: boolean }> {
  const result = await prisma.vault.updateMany({
    where: { tokenMint: mint, active: !active },
    data: active
      ? { active: true, consecutiveFailures: 0, lastErrorType: null, pausedAt: null, pauseReason: null }
      : { active: false, pausedAt: new Date(), pauseReason: "Manually paused by admin" },
  });

  if (result.count > 0) return { matched: true, alreadyDone: false };

  // Distinguish "not found" from "already in desired state"
  const exists = await prisma.vault.count({ where: { tokenMint: mint } });
  return { matched: exists > 0, alreadyDone: exists > 0 };
}

/**
 * POST /api/explore/vault-health/:mint/pause
 * Manually pause an active vault so the cranker skips it.
 */
router.post("/vault-health/:mint/pause", requireWalletAuth, adminLimit, async (req: Request<{ mint: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint)) {
    res.status(400).json({ error: "Invalid mint address" });
    return;
  }
  try {
    const { matched, alreadyDone } = await setVaultActive(req.params.mint, false);
    if (!matched) { res.status(404).json({ error: "Vault not found" }); return; }
    if (alreadyDone) { res.json({ success: true, message: "Vault is already paused" }); return; }
    console.log(`[vault-health] Manually paused vault: ${req.params.mint}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[vault-health/pause] Error:", err);
    res.status(500).json({ error: "Failed to pause vault" });
  }
});

/**
 * POST /api/explore/vault-health/:mint/reactivate
 * Reactivate a paused vault.
 */
router.post("/vault-health/:mint/reactivate", requireWalletAuth, adminLimit, async (req: Request<{ mint: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint)) {
    res.status(400).json({ error: "Invalid mint address" });
    return;
  }
  try {
    const { matched, alreadyDone } = await setVaultActive(req.params.mint, true);
    if (!matched) { res.status(404).json({ error: "Vault not found" }); return; }
    if (alreadyDone) { res.json({ success: true, message: "Vault is already active" }); return; }
    console.log(`[vault-health] Reactivated vault: ${req.params.mint}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[vault-health/reactivate] Error:", err);
    res.status(500).json({ error: "Failed to reactivate vault" });
  }
});

/**
 * GET /api/explore/lp-summary
 * Returns LP automation overview for admin dashboard.
 */
router.get("/lp-summary", requireWalletAuth, adminLimit, async (_req: Request, res: Response) => {
  try {
    const vaults = await prisma.vault.findMany({
      where: { active: true },
      select: {
        tokenMint: true,
        name: true,
        symbol: true,
        graduated: true,
        lpDeployed: true,
        pendingLpSol: true,
        lpSolDeposited: true,
        lpPoolKey: true,
        totalPlatformFees: true,
      },
      orderBy: { pendingLpSol: "desc" },
    });

    const totalVaults = vaults.length;
    const graduatedVaults = vaults.filter((v) => v.graduated).length;
    const lpDeployedVaults = vaults.filter((v) => v.lpDeployed).length;
    const totalPendingLpSol = vaults.reduce((sum, v) => sum + v.pendingLpSol, 0n);
    const totalLpSolDeposited = vaults.reduce((sum, v) => sum + v.lpSolDeposited, 0n);
    const totalPlatformFees = vaults.reduce((sum, v) => sum + v.totalPlatformFees, 0n);

    res.json({
      totalVaults,
      graduatedVaults,
      lpDeployedVaults,
      totalPendingLpSol: totalPendingLpSol.toString(),
      totalLpSolDeposited: totalLpSolDeposited.toString(),
      totalPlatformFees: totalPlatformFees.toString(),
      vaults: vaults.map((v) => ({
        mint: v.tokenMint,
        name: v.name || "Unknown",
        symbol: v.symbol || "???",
        graduated: v.graduated,
        lpDeployed: v.lpDeployed,
        pendingLpSol: v.pendingLpSol.toString(),
        lpSolDeposited: v.lpSolDeposited.toString(),
        lpPoolKey: v.lpPoolKey,
        totalPlatformFees: v.totalPlatformFees.toString(),
      })),
    });
  } catch (err: any) {
    console.error("[explore/lp-summary] Error:", err);
    res.status(500).json({ error: "Failed to fetch LP summary" });
  }
});

/**
 * GET /api/explore/health
 * Proxies to cranker /health for admin dashboard health check.
 */
router.get("/health", requireWalletAuth, adminLimit, async (_req: Request, res: Response) => {
  try {
    const result = await crankerGet("/health");
    if (!result.ok) {
      res.status(result.status).json(result.data);
      return;
    }
    res.json(result.data);
  } catch (err: any) {
    console.error("[explore/health] Cranker unreachable:", err.message);
    res.status(502).json({ error: "Cranker unreachable" });
  }
});

/**
 * POST /api/explore/vault-health/:mint/verify
 * Re-check on-chain state and update vaultCreated + feeSharingConfirmed flags.
 */
router.post("/vault-health/:mint/verify", requireWalletAuth, adminLimit, async (req: Request<{ mint: string }>, res: Response) => {
  if (!parsePubkey(req.params.mint)) {
    res.status(400).json({ error: "Invalid mint address" });
    return;
  }
  try {
    const vault = await prisma.vault.findUnique({ where: { tokenMint: req.params.mint } });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const mintPubkey = new PublicKey(req.params.mint);
    const connection = getConnection();

    // Check vault + fee sharing accounts on-chain in parallel
    const [vaultPda] = deriveVaultPda(mintPubkey);
    const sharingConfigKey = feeSharingConfigPda(mintPubkey);
    const [vaultInfo, sharingInfo] = await Promise.all([
      connection.getAccountInfo(vaultPda),
      connection.getAccountInfo(sharingConfigKey),
    ]);

    const updates: Record<string, any> = {};
    if (vaultInfo && !vault.vaultCreated) {
      updates.vaultCreated = true;
    }
    if (sharingInfo && !vault.feeSharingConfirmed) {
      updates.feeSharingConfirmed = true;
      updates.confirmedAt = new Date();
    }

    if (Object.keys(updates).length > 0) {
      await prisma.vault.update({
        where: { tokenMint: req.params.mint },
        data: updates,
      });
      console.log(`[vault-health/verify] Updated ${req.params.mint}: ${Object.keys(updates).join(", ")}`);
    }

    res.json({
      success: true,
      mint: req.params.mint,
      vaultOnChain: !!vaultInfo,
      feeSharingOnChain: !!sharingInfo,
      updated: Object.keys(updates),
    });
  } catch (err: any) {
    console.error("[vault-health/verify] Error:", err);
    res.status(500).json({ error: "Failed to verify vault on-chain" });
  }
});

export default router;
