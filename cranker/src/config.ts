import "dotenv/config";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { createThrottledConnection } from "./utils/rpcThrottle";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// Solana
export const RPC_URL = requireEnv("RPC_URL");
export const CRANKER_PRIVATE_KEY = requireEnv("CRANKER_PRIVATE_KEY");
export const ANVIL_PROGRAM_ID = new PublicKey(
  requireEnv("ANVIL_PROGRAM_ID")
);

// Rate-limited connection: all RPC calls go through a token-bucket throttle
const RPC_RATE_LIMIT = parseInt(process.env.RPC_RATE_LIMIT || "10", 10);
const rawConnection = new Connection(RPC_URL, "confirmed");
export const connection = createThrottledConnection(rawConnection, RPC_RATE_LIMIT);

export const crankerKeypair = Keypair.fromSecretKey(
  bs58.decode(CRANKER_PRIVATE_KEY)
);

// Timing
export const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "60000", 10);
export const DISTRIBUTION_INTERVAL_MS = parseInt(
  process.env.DISTRIBUTION_INTERVAL_MS || "3600000",
  10
);
export const DUST_THRESHOLD_LAMPORTS = parseInt(
  process.env.DUST_THRESHOLD_LAMPORTS || "10000",
  10
);

// API
export const API_PORT = parseInt(process.env.CRANKER_API_PORT || "4001", 10);

// Limits
export const TOP_HOLDERS = 100;
export const MAX_TREE_LEAVES = 512;

// Concurrency — how many vaults to process in parallel per cycle step
export const VAULT_CONCURRENCY = parseInt(process.env.VAULT_CONCURRENCY || "3", 10);

// Staggering — max vaults to process per cycle (round-robin across cycles)
export const VAULTS_PER_CYCLE = parseInt(process.env.VAULTS_PER_CYCLE || "10", 10);

// Platform fees + LP automation
export const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS || "1000", 10);
export const DEFAULT_HOLDER_SPLIT_BPS = parseInt(process.env.DEFAULT_HOLDER_SPLIT_BPS || "5000", 10);
export const MIN_LP_THRESHOLD_LAMPORTS = parseInt(process.env.MIN_LP_THRESHOLD_LAMPORTS || "1000000000", 10);
export const SPLIT_CHANGE_LOCK_DAYS = parseInt(process.env.SPLIT_CHANGE_LOCK_DAYS || "7", 10);
export const LP_REVENUE_SPLIT_HOLDER_BPS = 0;      // 0% of LP revenue to holders
export const LP_REVENUE_SPLIT_COMPOUND_BPS = 10000; // 100% auto-compound back to LP

// Distribution drip — distribute only a fraction of new fees per interval (decay curve)
export const DRIP_RATE_BPS = parseInt(process.env.DRIP_RATE_BPS || "1000", 10); // 10% per interval

// Claim expiry — unclaimed allocations from zero-balance holders expire after this many hours
export const DEFAULT_CLAIM_EXPIRY_HOURS = parseInt(process.env.DEFAULT_CLAIM_EXPIRY_HOURS || "168", 10);

// Push model thresholds
export const MIN_DISTRIBUTION_THRESHOLD = BigInt(
  process.env.MIN_DISTRIBUTION_THRESHOLD || "50000000" // 0.05 SOL (post-split holder share)
);
export const MAX_DISTRIBUTION_INTERVAL_MS = parseInt(
  process.env.MAX_DISTRIBUTION_INTERVAL_MS || "86400000", 10 // 24 hours
);
export const PUSH_DUST_THRESHOLD = BigInt(
  process.env.PUSH_DUST_THRESHOLD || "890880" // rent-exempt minimum for new wallets (0-byte account)
);
export const PUSH_BATCH_SIZE = parseInt(
  process.env.PUSH_BATCH_SIZE || "21", 10 // on-chain MAX_PUSH_BATCH is 22, 1 slot margin
);

// LP harvest + deploy thresholds
export const MIN_HARVEST_THRESHOLD_LAMPORTS = parseInt(process.env.MIN_HARVEST_THRESHOLD_LAMPORTS || "10000000", 10); // 0.01 SOL min profit
export const LP_HARVEST_INTERVAL_MS = parseInt(process.env.LP_HARVEST_INTERVAL_MS || "21600000", 10); // 6 hours
export const MIN_LP_SWAP_LAMPORTS = 1_000_000; // 0.001 SOL — below this, skip swap
