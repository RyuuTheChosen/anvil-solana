import type { Connection, Transaction } from "@solana/web3.js";

/**
 * Function signature compatible with both wallet-adapter and Privy sendTransaction.
 */
export type SendTransactionFn = (
  tx: Transaction,
  connection: Connection,
  opts?: { skipPreflight?: boolean; preflightCommitment?: string }
) => Promise<string>;

/**
 * Check if an error was caused by user rejecting a wallet action.
 * Handles wallet-adapter, Privy embedded, and external wallet error patterns.
 */
export function isUserRejection(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("user cancelled") ||
    lower.includes("user canceled") ||
    lower.includes("rejected the request") ||
    lower.includes("transaction was rejected") ||
    lower.includes("approval denied") ||
    lower.includes("request cancelled")
  );
}

/**
 * Normalize wallet error to a user-friendly message.
 */
export function normalizeWalletError(err: unknown): string {
  if (isUserRejection(err)) return "Transaction cancelled";
  if (!err) return "Unknown error";
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("WalletSignTransactionError")) return "Wallet signing failed";
  if (msg.includes("WalletSendTransactionError")) return "Transaction send failed";
  if (msg.includes("insufficient funds") || msg.includes("Insufficient"))
    return "Insufficient SOL balance";
  return msg;
}
