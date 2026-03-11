import { Router } from "express";
import { prisma } from "../../db/client";

const router = Router();

interface StatsData {
  totalDistributedLamports: string;
  activeVaults: number;
  uniqueHolders: number;
  totalEpochs: number;
  totalLpDeployed: number;
  totalLpSolDeposited: string;
  totalPlatformFees: string;
  graduatedVaults: number;
}

let cache: { data: StatsData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * GET /api/stats
 * Returns platform-wide stats for the landing page.
 * Cached for 60 seconds to avoid hammering the DB.
 */
router.get("/", async (_req, res) => {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      res.json(cache.data);
      return;
    }

    const [activeVaults, holdersResult, epochsResult, lpDeployedCount, lpAggregates, graduatedCount] = await Promise.all([
      prisma.vault.count({ where: { active: true, feeSharingConfirmed: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT wallet) as count FROM "HolderBalance" WHERE balance > 0
      `,
      prisma.distributionRecord.aggregate({
        _sum: { epochNumber: true },
        _max: { epochNumber: true },
      }),
      prisma.vault.count({ where: { active: true, lpDeployed: true } }),
      prisma.vault.aggregate({
        where: { active: true },
        _sum: { lpSolDeposited: true, totalPlatformFees: true },
      }),
      prisma.vault.count({ where: { active: true, graduated: true } }),
    ]);

    // Sum totalAllocated across latest distribution per vault
    const latestDistributions = await prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT COALESCE(SUM(d."totalAllocated"), 0) as total
      FROM "DistributionRecord" d
      INNER JOIN (
        SELECT "vaultId", MAX("epochNumber") as max_epoch
        FROM "DistributionRecord"
        GROUP BY "vaultId"
      ) latest ON d."vaultId" = latest."vaultId" AND d."epochNumber" = latest.max_epoch
    `;

    // Total epochs = sum of max epoch per vault
    const totalEpochsResult = await prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT COALESCE(SUM(max_epoch), 0) as total
      FROM (
        SELECT MAX("epochNumber") as max_epoch FROM "DistributionRecord" GROUP BY "vaultId"
      ) sub
    `;

    const data: StatsData = {
      totalDistributedLamports: (latestDistributions[0]?.total ?? BigInt(0)).toString(),
      activeVaults,
      uniqueHolders: Number(holdersResult[0]?.count ?? BigInt(0)),
      totalEpochs: Number(totalEpochsResult[0]?.total ?? BigInt(0)),
      totalLpDeployed: lpDeployedCount,
      totalLpSolDeposited: (lpAggregates._sum.lpSolDeposited ?? BigInt(0)).toString(),
      totalPlatformFees: (lpAggregates._sum.totalPlatformFees ?? BigInt(0)).toString(),
      graduatedVaults: graduatedCount,
    };

    cache = { data, timestamp: Date.now() };
    res.json(data);
  } catch (err) {
    console.error("[api] /stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
