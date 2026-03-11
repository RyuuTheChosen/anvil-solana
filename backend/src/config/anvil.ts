import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./solana";

const programIdStr = process.env.ANVIL_PROGRAM_ID;
if (!programIdStr) {
  throw new Error("ANVIL_PROGRAM_ID env var is required");
}
export const ANVIL_PROGRAM_ID = new PublicKey(programIdStr);

// Seeds matching the on-chain constants
const PLATFORM_SEED = Buffer.from("anvil");
const PLATFORM_TAG = Buffer.from("platform");
const TREASURY_SEED = Buffer.from("treasury");
const VAULT_SEED = Buffer.from("vault");
const FEE_SEED = Buffer.from("fees");
const POOL_SEED = Buffer.from("pool");
const DISTRIBUTION_SEED = Buffer.from("distribution");
const CLAIM_SEED = Buffer.from("claimed");

export function derivePlatformConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, PLATFORM_TAG],
    ANVIL_PROGRAM_ID
  );
}

export function deriveTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, TREASURY_SEED],
    ANVIL_PROGRAM_ID
  );
}

export function deriveVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, VAULT_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveFeeAccountPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, FEE_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveVaultPoolPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED, POOL_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveDistributionPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [DISTRIBUTION_SEED, mint.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

export function deriveClaimPda(
  mint: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CLAIM_SEED, mint.toBuffer(), user.toBuffer()],
    ANVIL_PROGRAM_ID
  );
}

/**
 * Read the current platform fee from on-chain PlatformConfig.
 * Caches for 60s to avoid hammering RPC on every launch.
 */
let cachedFeeBps: number | null = null;
let cacheExpiry = 0;

export async function fetchPlatformFeeBps(): Promise<number> {
  if (cachedFeeBps !== null && Date.now() < cacheExpiry) return cachedFeeBps;

  const [pda] = derivePlatformConfigPda();
  const connection = getConnection();
  const info = await connection.getAccountInfo(pda);
  if (!info || !info.data || info.data.length < 138) {
    throw new Error("Failed to read on-chain PlatformConfig");
  }

  // Skip 8-byte discriminator, platformFeeBps is at offset 8 + 128 = 136 (u16 LE)
  const feeBps = info.data.readUInt16LE(136);
  cachedFeeBps = feeBps;
  cacheExpiry = Date.now() + 60_000;
  return feeBps;
}
