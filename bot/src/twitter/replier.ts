import { getWriteClient } from "./client";
import { log, error as logError } from "../logger";

/** Shorten an address to 7xK...abc format */
function shortenAddr(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 3)}...${addr.slice(-3)}`;
}

export async function replyToTweet(tweetId: string, text: string): Promise<string | null> {
  try {
    const client = getWriteClient();
    const result = await client.v2.reply(text.slice(0, 280), tweetId);
    log("replier", "Posted reply", { tweetId, replyId: result.data.id });
    return result.data.id;
  } catch (err) {
    logError("replier", "Failed to post reply", err);
    return null;
  }
}

export function formatLaunchSuccess(params: {
  name: string;
  symbol: string;
  mint: string;
  maxHolders: number;
  holderSplitBps: number;
  txSignature?: string;
  configureTxSig?: string;
}): string {
  const splitPct = (params.holderSplitBps / 100).toFixed(0);
  const txLinks = [
    params.txSignature ? `launch: https://solscan.io/tx/${params.txSignature}` : "",
    params.configureTxSig ? `config: https://solscan.io/tx/${params.configureTxSig}` : "",
  ].filter(Boolean).join("\n");
  const txSection = txLinks ? `\n\n${txLinks}` : "";
  return `${params.name} ($${params.symbol}) launched.\n\nmint: ${params.mint}\nholders: ${params.maxHolders} | split: ${splitPct}%${txSection}\n\nhttps://anvil-protocol.fun/vault/${params.mint}`;
}

export function formatBalanceReply(publicKey: string, balanceSol: number): string {
  return `wallet: ${shortenAddr(publicKey)}\nbalance: ${balanceSol.toFixed(4)} SOL`;
}

export function formatWalletReply(publicKey: string, isNew: boolean): string {
  if (isNew) {
    return `created your anvil wallet: ${shortenAddr(publicKey)}\n\nsend SOL to this address to launch tokens:\n${publicKey}`;
  }
  return `your anvil wallet: ${shortenAddr(publicKey)}\n\n${publicKey}`;
}

export function formatHelpReply(): string {
  return `commands:\n- @AnvilProtocol launch [name] $[TICKER] (attach image)\n- @AnvilProtocol balance\n- @AnvilProtocol wallet\n\nlaunch tokens with fee sharing for holders. send SOL to your wallet to get started.`;
}

export function formatErrorReply(err: string): string {
  return sanitizeErrorForReply(err);
}

export function formatNeedImageReply(): string {
  return "attach an image to your tweet to launch a token.\n\nexample: @AnvilProtocol launch MyToken $MTK";
}

export function formatNeedFundsReply(publicKey: string, needed: number): string {
  return `not enough SOL. send at least ${needed.toFixed(2)} SOL to your wallet:\n${publicKey}`;
}

/** Sanitize error messages — never expose internals to users */
function sanitizeErrorForReply(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("3/day") || lower.includes("daily")) {
    return "daily launch limit reached. try again tomorrow.";
  }
  if (lower.includes("insufficient") || lower.includes("balance") || lower.includes("not enough")) {
    return "not enough SOL. send SOL to your wallet first.";
  }
  if (lower.includes("pool")) {
    return "temporarily unavailable. try again in a few minutes.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "network issue. try again later.";
  }
  if (lower.includes("couldn't understand") || lower.includes("parse")) {
    return "couldn't understand your launch request. try: @AnvilProtocol launch TokenName $TICKER";
  }
  return "something went wrong. try again later.";
}
