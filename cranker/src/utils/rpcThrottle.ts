import { Connection } from "@solana/web3.js";

/**
 * Token-bucket rate limiter for RPC calls.
 * Allows bursts up to `maxTokens` then throttles to `rps` requests/second.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly refillRatePerMs: number;

  constructor(private maxTokens: number) {
    this.tokens = maxTokens;
    this.refillRatePerMs = maxTokens / 1000;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRatePerMs);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }
}

/** RPC methods that count against rate limits */
const RPC_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getMultipleAccountsInfo",
  "getTokenLargestAccounts",
  "getTokenAccountsByOwner",
  "getSignaturesForAddress",
  "getSignatureStatus",
  "getLatestBlockhash",
  "sendTransaction",
  "sendRawTransaction",
]);

/**
 * Wraps a Solana Connection with a token-bucket rate limiter.
 * All RPC method calls are throttled; non-RPC properties pass through.
 */
export function createThrottledConnection(
  connection: Connection,
  rps: number
): Connection {
  const bucket = new TokenBucket(rps);

  return new Proxy(connection, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function" && RPC_METHODS.has(prop as string)) {
        return async (...args: any[]) => {
          await bucket.acquire();
          return value.apply(target, args);
        };
      }
      return value;
    },
  });
}
