import { prisma } from "../db/client";

/**
 * Apply pending time-locked split changes that have passed their effective date.
 * Runs before distributions to ensure the correct split is used.
 */
export async function applyPendingSplitChanges(): Promise<void> {
  const pendingVaults = await prisma.vault.findMany({
    where: {
      active: true,
      pendingSplitBps: { not: null },
      splitEffectiveAt: { lte: new Date() },
    },
  });

  for (const vault of pendingVaults) {
    if (vault.pendingSplitBps == null) continue;

    await prisma.vault.update({
      where: { id: vault.id },
      data: {
        holderSplitBps: vault.pendingSplitBps,
        pendingSplitBps: null,
        splitProposedAt: null,
        splitEffectiveAt: null,
      },
    });

    console.log(
      `[split-change] ${vault.tokenMint}: applied split change to ${vault.pendingSplitBps}bps`
    );
  }
}
