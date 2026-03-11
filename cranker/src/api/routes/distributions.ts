import { Router } from "express";
import { prisma } from "../../db/client";
import { parsePubkey } from "../../utils/validate";

const router = Router();

/**
 * GET /distributions/:mint
 */
router.get("/:mint", async (req, res) => {
  try {
    const mint = req.params.mint as string;

    if (!parsePubkey(mint)) {
      res.status(400).json({ error: "Invalid mint address" });
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
      // No distribution yet — return tracked holders from HolderBalance table
      const holders = await prisma.holderBalance.findMany({
        where: { vaultId: vault.id, balance: { gt: 0n } },
        orderBy: { balance: "desc" },
        take: 100,
      });

      res.json({
        merkleRoot: null,
        totalAllocated: "0",
        epochCount: 0,
        holderCount: holders.length,
        topHolders: holders.map((h: any) => ({
          wallet: h.wallet,
          cumulativeAmount: "0",
          balance: h.balance.toString(),
          score: 0,
        })),
      });
      return;
    }

    const allocations = await prisma.allocationRecord.findMany({
      where: { distributionId: distribution.id },
      orderBy: { cumulativeAmount: "desc" },
      take: 100,
    });

    // If allocations were wiped (e.g. migration), fall back to holder balances
    if (allocations.length === 0) {
      const holders = await prisma.holderBalance.findMany({
        where: { vaultId: vault.id, balance: { gt: 0n } },
        orderBy: { balance: "desc" },
        take: 100,
      });

      res.json({
        merkleRoot: null,
        totalAllocated: "0",
        epochCount: 0,
        holderCount: holders.length,
        topHolders: holders.map((h: any) => ({
          wallet: h.wallet,
          cumulativeAmount: h.totalReceived.toString(),
          balance: h.balance.toString(),
          score: 0,
        })),
      });
      return;
    }

    res.json({
      merkleRoot: distribution.merkleRoot,
      totalAllocated: distribution.totalAllocated.toString(),
      epochCount: distribution.epochNumber,
      holderCount: distribution.holderCount,
      topHolders: allocations.map((a: any) => ({
        wallet: a.wallet,
        cumulativeAmount: a.cumulativeAmount.toString(),
        score: a.score,
      })),
    });
  } catch (err) {
    console.error("[api] /distributions/:mint error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
