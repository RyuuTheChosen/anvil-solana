import { prisma } from "../db";
import { config } from "../config";
import { log, warn, error as logError } from "../logger";
import { getReadClient } from "./client";
import { routeCommand } from "./commands";
import { parseLaunchTweet } from "./parser";
import {
  replyToTweet,
  formatLaunchSuccess,
  formatBalanceReply,
  formatWalletReply,
  formatHelpReply,
  formatErrorReply,
  formatNeedImageReply,
  formatNeedFundsReply,
} from "./replier";
import { downloadTweetImage } from "../launch/media";
import { executeLaunch } from "../launch/executor";
import * as backend from "../launch/backendClient";

const MAX_TWEETS_PER_TICK = 5;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let processing = false;
let stopping = false;

export function startPoller(): void {
  log("poller", `Starting poller (interval: ${config.pollIntervalMs}ms)`);
  pollInterval = setInterval(pollTick, config.pollIntervalMs);
  // Run first tick immediately
  pollTick();
}

export async function stopPoller(): Promise<void> {
  stopping = true;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  // Wait for in-progress work (max 30s)
  const start = Date.now();
  while (processing && Date.now() - start < 30_000) {
    await new Promise(r => setTimeout(r, 500));
  }
  log("poller", "Poller stopped");
}

async function pollTick(): Promise<void> {
  if (processing || stopping) return;
  processing = true;

  try {
    // Load sinceId from BotConfig
    const botConfig = await prisma.botConfig.findUnique({ where: { id: "singleton" } });
    const sinceId = botConfig?.sinceId || undefined;

    // Search for mentions
    const client = getReadClient();
    const query = `@AnvilProtocol -is:retweet`;

    const searchParams: Record<string, unknown> = {
      max_results: 10,
      "tweet.fields": "author_id,attachments",
      expansions: "attachments.media_keys",
      "media.fields": "url,type",
    };
    if (sinceId) {
      searchParams.since_id = sinceId;
    }

    const result = await client.v2.search(query, searchParams as any);

    const tweets = result.data?.data || [];
    if (tweets.length === 0) {
      return;
    }

    // First poll ever — skip old mentions, just save the newest ID
    if (!sinceId) {
      const newestId = tweets[0].id; // Twitter returns newest first
      await prisma.botConfig.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", sinceId: newestId },
        update: { sinceId: newestId },
      });
      log("poller", `First poll — skipping ${tweets.length} old mentions, synced to ${newestId}`);
      return;
    }

    // Build media lookup from includes
    const mediaMap = new Map<string, string>();
    const includes = (result as any).includes;
    if (includes?.media) {
      for (const m of includes.media) {
        if (m.type === "photo" && m.url) {
          mediaMap.set(m.media_key, m.url);
        }
      }
    }

    // Process oldest-first (Twitter returns newest-first)
    const ordered = [...tweets].reverse();
    let newestId = sinceId;
    let processed = 0;

    for (const tweet of ordered) {
      if (processed >= MAX_TWEETS_PER_TICK) break;
      if (stopping) break;

      // Track newest for sinceId update
      if (!newestId || tweet.id > newestId) {
        newestId = tweet.id;
      }

      // Skip self-mentions
      if (tweet.author_id === config.twitterBotUserId) continue;

      processed++;

      try {
        await processTweet(tweet, mediaMap);
      } catch (err) {
        logError("poller", `Error processing tweet ${tweet.id}`, err);
      }
    }

    // Update sinceId
    if (newestId && newestId !== sinceId) {
      await prisma.botConfig.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", sinceId: newestId },
        update: { sinceId: newestId },
      });
    }
  } catch (err) {
    logError("poller", "Poll tick failed", err);
  } finally {
    processing = false;
  }
}

async function processTweet(
  tweet: { id: string; text: string; author_id?: string; attachments?: { media_keys?: string[] } },
  mediaMap: Map<string, string>,
): Promise<void> {
  const authorId = tweet.author_id;
  if (!authorId) return;

  const command = routeCommand(tweet.text);
  log("poller", `Tweet ${tweet.id}: command=${command}`, { author: authorId });

  if (command === "unknown") return;

  switch (command) {
    case "help":
      await replyToTweet(tweet.id, formatHelpReply());
      return;

    case "balance":
      await handleBalance(tweet.id, authorId);
      return;

    case "wallet":
      await handleWallet(tweet.id, authorId);
      return;

    case "launch":
      await handleLaunch(tweet, authorId, mediaMap);
      return;
  }
}

async function handleBalance(tweetId: string, authorId: string): Promise<void> {
  const walletRes = await backend.getWallet(authorId);
  if (!walletRes.ok || !walletRes.data.success || !walletRes.data.publicKey) {
    await replyToTweet(tweetId, "you don't have an anvil wallet yet. reply with @AnvilProtocol wallet to create one.");
    return;
  }

  const balanceRes = await backend.getBalance(authorId);
  const balanceSol = balanceRes.data.balanceSol ?? 0;
  await replyToTweet(tweetId, formatBalanceReply(walletRes.data.publicKey, balanceSol));
}

async function handleWallet(tweetId: string, authorId: string): Promise<void> {
  const walletRes = await backend.getWallet(authorId);
  if (walletRes.ok && walletRes.data.success && walletRes.data.publicKey) {
    await replyToTweet(tweetId, formatWalletReply(walletRes.data.publicKey, false));
    return;
  }

  // Create new wallet
  const createRes = await backend.createWallet(authorId, authorId);
  if (createRes.ok && createRes.data.publicKey) {
    const isNew = !createRes.data.existing;
    await replyToTweet(tweetId, formatWalletReply(createRes.data.publicKey, isNew));
  } else {
    await replyToTweet(tweetId, formatErrorReply("something went wrong"));
  }
}

async function handleLaunch(
  tweet: { id: string; text: string; attachments?: { media_keys?: string[] } },
  authorId: string,
  mediaMap: Map<string, string>,
): Promise<void> {
  // Ensure wallet exists
  let walletRes = await backend.getWallet(authorId);
  if (!walletRes.ok || !walletRes.data.success || !walletRes.data.publicKey) {
    // Create wallet for first-time user
    const createRes = await backend.createWallet(authorId, authorId);
    if (!createRes.ok || !createRes.data.publicKey) {
      await replyToTweet(tweet.id, formatErrorReply("something went wrong"));
      return;
    }
    // Reply with wallet info — do NOT attempt launch on first interaction
    await replyToTweet(tweet.id, formatWalletReply(createRes.data.publicKey, true));
    return;
  }

  // Check for attached image
  const mediaKeys = tweet.attachments?.media_keys || [];
  let imageUrl: string | null = null;
  for (const key of mediaKeys) {
    const url = mediaMap.get(key);
    if (url) { imageUrl = url; break; }
  }

  if (!imageUrl) {
    await replyToTweet(tweet.id, formatNeedImageReply());
    return;
  }

  // Download image
  const imageBuffer = await downloadTweetImage(imageUrl);
  if (!imageBuffer) {
    await replyToTweet(tweet.id, formatNeedImageReply());
    return;
  }

  // Parse launch params with Claude
  const parsed = await parseLaunchTweet(tweet.text);
  if (!parsed) {
    await replyToTweet(tweet.id, formatErrorReply("couldn't understand"));
    return;
  }

  // Create BotLaunch record (dedup via tweetId unique constraint)
  let botLaunch;
  try {
    botLaunch = await prisma.botLaunch.create({
      data: {
        walletId: (await prisma.botWallet.findUnique({ where: { xUserId: authorId } }))!.id,
        tweetId: tweet.id,
        tokenName: parsed.name,
        tokenSymbol: parsed.symbol,
        devBuySol: parsed.devBuySol,
        maxHolders: parsed.maxHolders,
        holderSplitBps: parsed.holderSplitBps,
        status: "parsing",
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      log("poller", "Tweet already being processed", { tweetId: tweet.id });
      return;
    }
    throw err;
  }

  // Execute the launch pipeline
  const result = await executeLaunch(botLaunch.id, authorId, parsed, imageBuffer);

  // Reply with result
  let replyText: string;
  if (result.success && result.mint) {
    replyText = formatLaunchSuccess({
      name: parsed.name,
      symbol: parsed.symbol,
      mint: result.mint,
      maxHolders: parsed.maxHolders,
      holderSplitBps: parsed.holderSplitBps,
      txSignature: result.txSignature,
      configureTxSig: result.configureTxSig,
    });
  } else {
    replyText = formatErrorReply(result.error || "something went wrong");
  }

  const replyId = await replyToTweet(tweet.id, replyText);
  if (replyId) {
    await prisma.botLaunch.update({
      where: { id: botLaunch.id },
      data: { replyTweetId: replyId },
    });
  }
}
