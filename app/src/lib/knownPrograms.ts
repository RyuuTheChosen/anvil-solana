import { PublicKey } from "@solana/web3.js";

/**
 * Map of known program IDs that may appear in Anvil Protocol transactions.
 * Used to warn users about unrecognized programs before signing.
 */
export const KNOWN_PROGRAMS: ReadonlyMap<string, string> = new Map([
  // Solana native
  ["11111111111111111111111111111111", "System Program"],
  ["ComputeBudget111111111111111111111111111111", "Compute Budget"],
  ["SysvarRent111111111111111111111111111111111", "Rent Sysvar"],
  ["SysvarC1ock11111111111111111111111111111111", "Clock Sysvar"],
  ["Sysvar1nstructions1111111111111111111111111", "Instructions Sysvar"],

  // SPL Token
  ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "SPL Token"],
  ["ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "Associated Token Account"],
  ["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "Token-2022"],

  // Metaplex
  ["metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", "Metaplex Token Metadata"],

  // PumpFun
  ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", "PumpFun"],
  ["Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjQ7GWkRGFMb", "PumpFun Event Authority"],
  ["PSwapMdSai8tjrEXcxFeQth87xC4rRsa4VA5mhGhXkP", "PumpSwap AMM"],
  ["pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ", "PumpFun Fee Sharing"],

  // Anvil Protocol
  ["6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs", "Anvil Protocol"],
]);

/**
 * Check transaction instructions against known programs.
 * Returns a list of unrecognized program IDs (empty if all are known).
 */
export function findUnknownPrograms(
  programIds: PublicKey[]
): { id: string; index: number }[] {
  const unknown: { id: string; index: number }[] = [];
  for (let i = 0; i < programIds.length; i++) {
    const id = programIds[i].toBase58();
    if (!KNOWN_PROGRAMS.has(id)) {
      unknown.push({ id, index: i });
    }
  }
  return unknown;
}
