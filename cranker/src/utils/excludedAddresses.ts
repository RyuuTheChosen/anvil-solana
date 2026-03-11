import { PublicKey } from "@solana/web3.js";

// PumpFun program IDs
const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_AMM_PROGRAM_ID = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");

function pumpPda(seeds: Buffer[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PUMP_PROGRAM_ID)[0];
}

function pumpAmmPda(seeds: Buffer[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PUMP_AMM_PROGRAM_ID)[0];
}

export function bondingCurvePda(mint: PublicKey): PublicKey {
  return pumpPda([Buffer.from("bonding-curve"), mint.toBuffer()]);
}

export function canonicalPumpPoolPda(mint: PublicKey): PublicKey {
  const poolAuthority = pumpPda([Buffer.from("pool-authority"), mint.toBuffer()]);
  // Pool index 0 as u16 LE
  const indexBuf = Buffer.alloc(2);
  indexBuf.writeUInt16LE(0);
  return pumpAmmPda([
    Buffer.from("pool"),
    indexBuf,
    poolAuthority.toBuffer(),
    mint.toBuffer(),
    NATIVE_MINT.toBuffer(),
  ]);
}

/**
 * Derive addresses to exclude from holder tracking:
 * bonding curve, PumpSwap pool, and their associated token accounts (owners).
 * Since we parse token account owners, we exclude the owner addresses.
 */
export function deriveExcludedAddresses(mint: PublicKey): Set<string> {
  const excluded = new Set<string>();
  excluded.add(bondingCurvePda(mint).toBase58());
  excluded.add(canonicalPumpPoolPda(mint).toBase58());
  return excluded;
}
