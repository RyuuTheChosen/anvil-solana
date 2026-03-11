import { Router } from "express";
import { prisma } from "../../db/client";
import { getOnChainClaimed } from "../../utils/onchain";
import { parsePubkey } from "../../utils/validate";
import { DEFAULT_CLAIM_EXPIRY_HOURS } from "../../config";

const router = Router();

/**
 * GET /claims/proof/:mint/:wallet
 */
router.get("/proof/:mint/:wallet", async (req, res) => {
  try {
    const mint = req.params.mint as string;
    const wallet = req.params.wallet as string;

    if (!parsePubkey(mint) || !parsePubkey(wallet)) {
      res.status(400).json({ error: "Invalid mint or wallet address" });
      return;
    }

    const vault = await prisma.vault.findUnique({
      where: { tokenMint: mint },
    });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const distribution = await prisma.distributionRecord.findFirst({
      where: { vaultId: vault.id },
      orderBy: { epochNumber: "desc" },
    });

    if (!distribution) {
      res.json({ cumulativeAmount: "0", proof: [], alreadyClaimed: "0", claimable: "0", epochNumber: 0 });
      return;
    }

    const allocation = await prisma.allocationRecord.findUnique({
      where: { distributionId_wallet: { distributionId: distribution.id, wallet } },
    });

    if (!allocation) {
      res.json({ cumulativeAmount: "0", proof: [], alreadyClaimed: "0", claimable: "0", epochNumber: distribution.epochNumber });
      return;
    }

    const alreadyClaimed = await getOnChainClaimed(mint, wallet);
    const claimable = allocation.cumulativeAmount - alreadyClaimed;

    // If wallet has zero balance, compute expiry deadline
    let expiresAt: string | null = null;
    const holder = await prisma.holderBalance.findUnique({
      where: { vaultId_wallet: { vaultId: vault.id, wallet } },
    });
    if (holder && holder.balance === 0n && holder.balanceZeroSince) {
      const expiryHours = vault.claimExpiryHours ?? DEFAULT_CLAIM_EXPIRY_HOURS;
      expiresAt = new Date(holder.balanceZeroSince.getTime() + expiryHours * 3600_000).toISOString();
    }

    // Check if already expired
    const expiredRecord = await prisma.expiredAllocation.findUnique({
      where: { vaultId_wallet: { vaultId: vault.id, wallet } },
    });

    res.json({
      cumulativeAmount: allocation.cumulativeAmount.toString(),
      proof: JSON.parse(allocation.proof),
      alreadyClaimed: alreadyClaimed.toString(),
      claimable: (claimable > 0n ? claimable : 0n).toString(),
      epochNumber: distribution.epochNumber,
      expiresAt,
      expired: !!expiredRecord,
    });
  } catch (err) {
    console.error("[api] /claims/:mint/:wallet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /claims/user/:wallet
 */
router.get("/user/:wallet", async (req, res) => {
  try {
    const wallet = req.params.wallet as string;

    if (!parsePubkey(wallet)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    // Single query: get all allocations for this wallet from the latest distribution of each active vault
    const rows: { mint: string; cumulativeAmount: bigint }[] = await prisma.$queryRaw`
      SELECT v."tokenMint" as mint, a."cumulativeAmount"
      FROM "AllocationRecord" a
      INNER JOIN "DistributionRecord" d ON a."distributionId" = d.id
      INNER JOIN (
        SELECT "vaultId", MAX("epochNumber") as max_epoch
        FROM "DistributionRecord"
        GROUP BY "vaultId"
      ) latest ON d."vaultId" = latest."vaultId" AND d."epochNumber" = latest.max_epoch
      INNER JOIN "Vault" v ON v.id = d."vaultId"
      WHERE a.wallet = ${wallet} AND v.active = true
    `;

    // Get all expired allocations for this wallet to filter them out
    const expiredAllocations = await prisma.expiredAllocation.findMany({
      where: { wallet },
      select: { vaultId: true },
    });
    const expiredVaultIds = new Set(expiredAllocations.map((e) => e.vaultId));

    const claims: { mint: string; cumulativeAmount: string; alreadyClaimed: string; claimable: string; distributionMode?: string; totalReceived?: string }[] = [];

    for (const row of rows) {
      // Look up vault for this mint to check against expired set and get mode
      const vault = await prisma.vault.findUnique({
        where: { tokenMint: row.mint },
        select: { id: true, distributionMode: true },
      });
      if (vault && expiredVaultIds.has(vault.id)) continue; // Skip expired

      if (vault?.distributionMode === "push") {
        // Push mode: use totalReceived from DB
        const holder = await prisma.holderBalance.findUnique({
          where: { vaultId_wallet: { vaultId: vault.id, wallet } },
        });
        const totalReceived = holder?.totalReceived ?? 0n;
        claims.push({
          mint: row.mint,
          cumulativeAmount: row.cumulativeAmount.toString(),
          alreadyClaimed: totalReceived.toString(),
          claimable: "0", // push mode — no manual claiming
          distributionMode: "push",
          totalReceived: totalReceived.toString(),
        });
      } else {
        // Pull mode: use on-chain claimed
        const alreadyClaimed = await getOnChainClaimed(row.mint, wallet);
        const claimable = row.cumulativeAmount - alreadyClaimed;
        claims.push({
          mint: row.mint,
          cumulativeAmount: row.cumulativeAmount.toString(),
          alreadyClaimed: alreadyClaimed.toString(),
          claimable: (claimable > 0n ? claimable : 0n).toString(),
          distributionMode: "pull",
        });
      }
    }

    res.json({ claims });
  } catch (err) {
    console.error("[api] /claims/user/:wallet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /claims/history/:mint/:wallet
 * Returns push distribution history for a wallet in a vault.
 */
router.get("/history/:mint/:wallet", async (req, res) => {
  try {
    const mint = req.params.mint as string;
    const wallet = req.params.wallet as string;

    if (!parsePubkey(mint) || !parsePubkey(wallet)) {
      res.status(400).json({ error: "Invalid mint or wallet address" });
      return;
    }

    const vault = await prisma.vault.findUnique({
      where: { tokenMint: mint },
    });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const holder = await prisma.holderBalance.findUnique({
      where: { vaultId_wallet: { vaultId: vault.id, wallet } },
    });

    const totalReceived = holder?.totalReceived ?? 0n;

    // Get recent push records for this wallet
    const pushRecords = await prisma.pushRecord.findMany({
      where: { wallet, distribution: { vaultId: vault.id }, status: "confirmed" },
      orderBy: { pushedAt: "desc" },
      take: 20,
      select: {
        amount: true,
        batchTxSig: true,
        pushedAt: true,
      },
    });

    res.json({
      distributionMode: vault.distributionMode,
      totalReceived: totalReceived.toString(),
      pushes: pushRecords.map((p) => ({
        amount: p.amount.toString(),
        txSignature: p.batchTxSig,
        pushedAt: p.pushedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api] /claims/history/:mint/:wallet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
