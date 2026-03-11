import { prisma } from "./db/client";

export async function getPoolSize(suffix: string): Promise<number> {
  return prisma.vanityKeypair.count({
    where: { claimed: false, suffix },
  });
}

export interface PoolStats {
  available: number;
  claimed: number;
  confirmed: number;
  total: number;
}

export async function getPoolStats(suffix: string): Promise<PoolStats> {
  const [available, claimed, confirmed, total] = await Promise.all([
    prisma.vanityKeypair.count({ where: { claimed: false, suffix } }),
    prisma.vanityKeypair.count({ where: { claimed: true, confirmedOnChain: false, suffix } }),
    prisma.vanityKeypair.count({ where: { confirmedOnChain: true, suffix } }),
    prisma.vanityKeypair.count({ where: { suffix } }),
  ]);

  return { available, claimed, confirmed, total };
}

export async function unclaimStaleKeypairs(maxAgeMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);

  const result = await prisma.$executeRaw`
    UPDATE "VanityKeypair"
    SET claimed = false, "claimedAt" = NULL
    WHERE claimed = true
      AND "confirmedOnChain" = false
      AND "claimedAt" < ${cutoff}
  `;

  return result;
}
