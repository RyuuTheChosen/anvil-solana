import { PublicKey } from "@solana/web3.js";
import { RPC_URL } from "../config";

interface HeliusTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegated_amount: number;
  frozen: boolean;
}

interface HeliusResponse {
  result: {
    total: number;
    limit: number;
    cursor?: string;
    token_accounts: HeliusTokenAccount[];
  };
}

export interface TokenHolder {
  wallet: string;
  balance: bigint;
}

/**
 * Fetch top token holders for a mint using the Helius DAS `getTokenAccounts` API.
 * Paginates through all accounts, deduplicates by owner, sorts by balance desc,
 * and returns the top `maxHolders` holders (excluding PDAs).
 *
 * Falls back to null if the RPC doesn't support the DAS method.
 */
export async function fetchTopHolders(
  mintStr: string,
  maxHolders: number
): Promise<TokenHolder[] | null> {
  const allAccounts: HeliusTokenAccount[] = [];
  let cursor: string | null = null;
  const MAX_PAGES = 50; // safety cap: 50 * 1000 = 50k accounts max

  for (let page = 0; page < MAX_PAGES; page++) {
    let response: HeliusResponse;
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `holders-${page}`,
          method: "getTokenAccounts",
          params: {
            mint: mintStr,
            limit: 1000,
            ...(cursor ? { cursor } : {}),
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const json = await res.json();

      // If RPC doesn't support this method, return null to trigger fallback
      if (json.error) {
        if (page === 0) {
          console.warn(`[helius] getTokenAccounts not supported: ${json.error.message}`);
          return null;
        }
        break;
      }

      response = json as HeliusResponse;
    } catch (err) {
      if (page === 0) {
        console.warn(`[helius] getTokenAccounts failed, will use fallback:`, err);
        return null;
      }
      break;
    }

    const accounts = response.result.token_accounts;
    if (!accounts || accounts.length === 0) break;

    allAccounts.push(...accounts);
    cursor = response.result.cursor ?? null;

    // No more pages
    if (!cursor || accounts.length < 1000) break;
  }

  if (allAccounts.length === 0) return null;

  // Deduplicate by owner — a wallet can have multiple token accounts for the same mint
  const ownerMap = new Map<string, bigint>();
  for (const acc of allAccounts) {
    if (acc.amount <= 0) continue;
    const prev = ownerMap.get(acc.owner) ?? 0n;
    ownerMap.set(acc.owner, prev + BigInt(acc.amount));
  }

  // Filter out PDA (off-curve) addresses — they can never claim
  const holders: TokenHolder[] = [];
  for (const [wallet, balance] of ownerMap) {
    try {
      const pubkey = new PublicKey(wallet);
      if (!PublicKey.isOnCurve(pubkey.toBytes())) continue;
    } catch {
      continue;
    }
    holders.push({ wallet, balance });
  }

  // Sort by balance descending, take top maxHolders
  holders.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  return holders.slice(0, maxHolders);
}
