import { Connection, PublicKey } from "@solana/web3.js";
import { parsePubkey } from "./validate";
import { crankerGet } from "./crankerClient";
import { prisma } from "./db";
import { config } from "./config";
import type Anthropic from "@anthropic-ai/sdk";

// ─── Types ───

export interface RequestContext {
  wallet: PublicKey | null;
  walletAddress: string | null;
  userId: string | null;
  connection: Connection;
}

interface ToolResult {
  error?: string;
  action?: string;
  [key: string]: unknown;
}

type ToolHandler = (input: Record<string, unknown>, ctx: RequestContext) => Promise<ToolResult>;

// ─── Sanitization ───

function sanitizeString(str: string, maxLen: number): string {
  return str
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
    .replace(/[<>{}\\]/g, "")
    .slice(0, maxLen);
}

function truncateArrays(obj: unknown, maxItems: number = 20): unknown {
  if (Array.isArray(obj)) {
    const sliced = obj.slice(0, maxItems);
    if (obj.length > maxItems) {
      sliced.push({ _truncated: true, total: obj.length, shown: maxItems });
    }
    return sliced.map((item) => truncateArrays(item, maxItems));
  }
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = truncateArrays(v, maxItems);
    }
    return out;
  }
  return obj;
}

function sanitizeToolResult(result: ToolResult): string {
  const truncated = truncateArrays(result);
  let json = JSON.stringify(truncated);
  json = json.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  if (json.length > 4096) {
    // Last resort — should rarely hit after array truncation
    json = JSON.stringify({ error: "Response too large", summary: json.slice(0, 500) });
  }
  return json;
}

// ─── Tool Definitions (Claude tool_use format) ───

const toolDefinitions: Anthropic.Tool[] = [
  // Wallet tools
  {
    name: "get_sol_balance",
    description: "Get SOL balance for the authenticated user's wallet",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_token_balances",
    description: "Get all SPL token holdings for the authenticated user",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "prepare_transfer",
    description:
      "Prepare a SOL or SPL token transfer for user confirmation. ALWAYS confirm recipient, amount, and token with the user before calling this.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient wallet address (base58)" },
        amount: { type: "number", description: "Amount to send (in token units, e.g. 1.5 SOL)" },
        mint: {
          type: "string",
          description: "SPL token mint address. Omit for SOL transfer.",
        },
      },
      required: ["to", "amount"],
    },
  },
  {
    name: "get_transaction_history",
    description: "Get recent transactions for the authenticated user",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of transactions (default 10, max 25)" },
      },
      required: [],
    },
  },
  // Platform tools
  {
    name: "explore_tokens",
    description: "Browse available tokens/vaults on the platform",
    input_schema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by token name or symbol" },
        limit: { type: "number", description: "Max results (default 10, max 25)" },
      },
      required: [],
    },
  },
  {
    name: "get_vault_details",
    description:
      "Get detailed info about a specific token vault including holder count, total distributed, fee split, and distribution history",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address" },
      },
      required: ["mint"],
    },
  },
  {
    name: "get_platform_stats",
    description: "Get platform-wide statistics (total distributed, active vaults, unique holders, epochs)",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "check_vault_status",
    description: "Check if a vault exists on-chain and its current state",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address" },
      },
      required: ["mint"],
    },
  },
  {
    name: "check_user_claims",
    description: "Check all claimable rewards across all vaults for the authenticated user",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "check_vault_rewards",
    description: "Check claimable rewards for a specific vault for the authenticated user",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address" },
      },
      required: ["mint"],
    },
  },
  {
    name: "prepare_claim",
    description: "Prepare a claim transaction for user confirmation",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address to claim from" },
      },
      required: ["mint"],
    },
  },
  {
    name: "prepare_claim_all",
    description: "Prepare claim transactions for all vaults with claimable rewards",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_holder_ranking",
    description: "Get the authenticated user's ranking and score breakdown for a vault",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address" },
      },
      required: ["mint"],
    },
  },
  {
    name: "get_distribution_history",
    description: "Get distribution history for a vault",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint address" },
        limit: { type: "number", description: "Number of epochs (default 10, max 50)" },
      },
      required: ["mint"],
    },
  },
  // Action tools
  {
    name: "navigate",
    description: "Direct the user to a specific page in the app",
    input_schema: {
      type: "object" as const,
      properties: {
        page: {
          type: "string",
          description: 'Page name: "launch", "explore", "vaults", "profile", "docs", or "vault/{mint}"',
        },
      },
      required: ["page"],
    },
  },
  {
    name: "start_launch_flow",
    description:
      "Begin the guided token launch flow. Collect token details conversationally then hand off to the launch page with pre-filled data.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Token name" },
        symbol: { type: "string", description: "Token symbol/ticker" },
        description: { type: "string", description: "Token description" },
        twitter: { type: "string", description: "Twitter URL" },
        telegram: { type: "string", description: "Telegram URL" },
        website: { type: "string", description: "Website URL" },
      },
      required: [],
    },
  },
  {
    name: "fund_wallet",
    description: "Show the user's wallet deposit address so they can send SOL to fund it",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "explain_concept",
    description:
      'Explain an Anvil/crypto concept to the user. Use for "what is...", "how does..." questions. Do NOT call for questions you can answer directly.',
    input_schema: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string",
          description:
            'One of: "vault", "merkle_proof", "fee_sharing", "holder_score", "distribution", "lp", "creator_fees", "claim"',
        },
      },
      required: ["concept"],
    },
  },
];

// ─── Auth Tier Filtering ───

const PUBLIC_TOOLS = new Set([
  "explore_tokens",
  "get_vault_details",
  "get_platform_stats",
  "check_vault_status",
  "get_distribution_history",
  "explain_concept",
  "navigate",
]);

export function getToolsForUser(authenticated: boolean): Anthropic.Tool[] {
  if (authenticated) return toolDefinitions;
  return toolDefinitions.filter((t) => PUBLIC_TOOLS.has(t.name));
}

// ─── Tool Handlers ───

// Advisory daily limit — in-memory, resets on restart. Real security comes from
// frontend confirmation + wallet signing. This just prevents the AI from preparing
// excessive transfers in a single session.
const DAILY_TRANSFER_LIMIT_SOL = 10;
const dailyTransfers = new Map<string, { total: number; resetAt: number }>();

function getDailyTransferTotal(userId: string): number {
  const entry = dailyTransfers.get(userId);
  if (!entry || Date.now() > entry.resetAt) return 0;
  return entry.total;
}

function addDailyTransfer(userId: string, amount: number): void {
  const entry = dailyTransfers.get(userId);
  const now = Date.now();
  if (!entry || now > entry.resetAt) {
    dailyTransfers.set(userId, {
      total: amount,
      resetAt: now + 24 * 60 * 60 * 1000,
    });
  } else {
    entry.total += amount;
  }
}

function requireAuth(ctx: RequestContext): ToolResult | null {
  if (!ctx.wallet || !ctx.walletAddress) {
    return { error: "You need to sign in first to use this feature." };
  }
  return null;
}

const toolHandlers: Record<string, ToolHandler> = {
  // ─── Wallet Tools ───

  async get_sol_balance(_input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const lamports = await ctx.connection.getBalance(ctx.wallet!);
    return {
      address: ctx.walletAddress!,
      balance: lamports / 1e9,
      balanceLamports: lamports,
    };
  },

  async get_token_balances(_input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const resp = await ctx.connection.getParsedTokenAccountsByOwner(ctx.wallet!, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });

    const tokens = resp.value
      .map((acct) => {
        const info = acct.account.data.parsed?.info;
        if (!info || !info.tokenAmount.uiAmount) return null;
        return {
          mint: info.mint,
          balance: info.tokenAmount.amount,
          uiAmount: info.tokenAmount.uiAmount,
          decimals: info.tokenAmount.decimals,
        };
      })
      .filter(Boolean)
      .slice(0, 50);

    return { tokens, count: tokens.length };
  },

  async prepare_transfer(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const to = parsePubkey(input.to as string);
    if (!to) return { error: "Invalid recipient address" };

    const amount = input.amount as number;
    if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
      return { error: "Invalid amount — must be greater than 0" };
    }

    const mintStr = input.mint as string | undefined;
    let mintPk: PublicKey | null = null;
    if (mintStr) {
      mintPk = parsePubkey(mintStr);
      if (!mintPk) return { error: "Invalid token mint address" };
    }

    // Check balance server-side
    if (!mintPk) {
      const lamports = await ctx.connection.getBalance(ctx.wallet!);
      const balance = lamports / 1e9;
      if (amount > balance) {
        return { error: `Insufficient SOL balance. Available: ${balance.toFixed(4)} SOL` };
      }
    } else {
      const accounts = await ctx.connection.getParsedTokenAccountsByOwner(ctx.wallet!, {
        mint: mintPk,
      });
      const tokenAcct = accounts.value[0]?.account.data.parsed?.info;
      if (!tokenAcct || tokenAcct.tokenAmount.uiAmount < amount) {
        const available = tokenAcct?.tokenAmount.uiAmount ?? 0;
        return { error: `Insufficient token balance. Available: ${available}` };
      }
    }

    // Daily transfer limit
    const solEquivalent = mintPk ? amount * 0.001 : amount; // rough estimate for tokens
    const dailyTotal = getDailyTransferTotal(ctx.userId!);
    if (dailyTotal + solEquivalent > DAILY_TRANSFER_LIMIT_SOL) {
      const remaining = Math.max(0, DAILY_TRANSFER_LIMIT_SOL - dailyTotal);
      return {
        error: `Daily transfer limit (${DAILY_TRANSFER_LIMIT_SOL} SOL) reached. Remaining today: ${remaining.toFixed(2)} SOL.`,
      };
    }

    // Track the transfer attempt
    addDailyTransfer(ctx.userId!, solEquivalent);
    console.log(
      `[chat:transfer] user=${ctx.userId} to=${to.toBase58()} amount=${amount} mint=${mintPk?.toBase58() || "SOL"}`
    );

    return {
      action: "transfer",
      to: to.toBase58(),
      amount,
      mint: mintPk?.toBase58() || null,
      symbol: mintPk ? "TOKEN" : "SOL",
      estimatedFee: 0.000005,
    };
  },

  async get_transaction_history(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const limit = Math.min(Math.max((input.limit as number) || 10, 1), 25);
    const address = ctx.walletAddress!;

    // Extract Helius API key from SOLANA_RPC_URL (e.g. https://mainnet.helius-rpc.com/?api-key=xxx)
    const rpcUrl = config.solanaRpcUrl;
    let heliusKey: string | null = null;
    if (rpcUrl.includes("helius")) {
      try {
        heliusKey = new URL(rpcUrl).searchParams.get("api-key");
      } catch {
        // Malformed RPC URL — skip Helius, fall through to RPC fallback
      }
    }
    if (heliusKey) {
      try {
        const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${heliusKey}&limit=${limit}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const txs = (await res.json()) as any[];
          return {
            transactions: txs.map((tx: any) => ({
              signature: tx.signature,
              timestamp: tx.timestamp,
              type: sanitizeString(tx.type || "unknown", 32),
              description: sanitizeString(tx.description || "", 128),
            })),
          };
        }
      } catch {
        // Fall through to RPC fallback
      }
    }

    // RPC fallback — just signatures
    const sigs = await ctx.connection.getSignaturesForAddress(ctx.wallet!, { limit });
    return {
      transactions: sigs.map((s) => ({
        signature: s.signature,
        timestamp: s.blockTime,
        type: "unknown",
        description: s.memo ? sanitizeString(s.memo, 128) : "",
      })),
    };
  },

  // ─── Platform Tools ───

  async explore_tokens(input) {
    const search = input.search as string | undefined;
    const limit = Math.min(Math.max((input.limit as number) || 10, 1), 25);

    const where: any = { active: true, feeSharingConfirmed: true, vaultCreated: true };
    if (search) {
      const q = sanitizeString(search, 32);
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { symbol: { contains: q, mode: "insensitive" } },
      ];
    }

    const vaults = await prisma.vault.findMany({
      where,
      select: {
        tokenMint: true,
        name: true,
        symbol: true,
        imageUrl: true,
        creator: true,
        maxHolders: true,
        holderSplitBps: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      tokens: vaults.map((v: any) => ({
        mint: v.tokenMint,
        name: sanitizeString(v.name || "", 32),
        symbol: sanitizeString(v.symbol || "", 10),
        imageUrl: v.imageUrl?.slice(0, 256) || null,
        creator: v.creator,
        maxHolders: v.maxHolders,
        holderSplitBps: v.holderSplitBps,
        createdAt: v.createdAt,
      })),
      count: vaults.length,
    };
  },

  async get_vault_details(input) {
    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    const vault = await prisma.vault.findUnique({
      where: { tokenMint: mint.toBase58() },
      select: {
        tokenMint: true,
        name: true,
        symbol: true,
        imageUrl: true,
        creator: true,
        maxHolders: true,
        holderSplitBps: true,
        platformFeeBps: true,
        active: true,
        graduated: true,
        lpDeployed: true,
        createdAt: true,
      },
    });

    if (!vault) return { error: "Vault not found" };

    // Get distribution data from cranker
    let distroData: any = null;
    try {
      const res = await crankerGet(`/api/distributions/${mint.toBase58()}`);
      if (res.ok) distroData = res.data;
    } catch {
      // non-critical
    }

    const platformPct = vault.platformFeeBps / 100;
    const remaining = 100 - platformPct;
    const holderPct = (vault.holderSplitBps / 10000) * remaining;
    const lpPct = remaining - holderPct;

    return {
      mint: vault.tokenMint,
      name: sanitizeString(vault.name || "", 32),
      symbol: sanitizeString(vault.symbol || "", 10),
      imageUrl: vault.imageUrl?.slice(0, 256) || null,
      creator: vault.creator,
      maxHolders: vault.maxHolders,
      holderPct: Math.round(holderPct * 10) / 10,
      lpPct: Math.round(lpPct * 10) / 10,
      platformPct,
      active: vault.active,
      graduated: vault.graduated,
      lpDeployed: vault.lpDeployed,
      totalDistributed: distroData?.totalAllocated || "0",
      epochCount: distroData?.epochCount || 0,
      holderCount: distroData?.holderCount || 0,
      createdAt: vault.createdAt,
    };
  },

  async get_platform_stats() {
    try {
      const res = await crankerGet("/api/stats");
      if (!res.ok) return { error: "Could not fetch platform stats" };
      const d = res.data as any;
      return {
        totalDistributedSol: (parseInt(d.totalDistributedLamports || "0") / 1e9).toFixed(2),
        activeVaults: d.activeVaults || 0,
        uniqueHolders: d.uniqueHolders || 0,
        totalEpochs: d.totalEpochs || 0,
      };
    } catch {
      return { error: "Could not fetch platform stats" };
    }
  },

  async check_vault_status(input) {
    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    const vault = await prisma.vault.findUnique({
      where: { tokenMint: mint.toBase58() },
      select: {
        tokenMint: true,
        name: true,
        symbol: true,
        active: true,
        feeSharingConfirmed: true,
        vaultCreated: true,
        graduated: true,
      },
    });

    if (!vault) {
      return { exists: false, mint: mint.toBase58() };
    }

    return {
      exists: true,
      mint: vault.tokenMint,
      name: sanitizeString(vault.name || "", 32),
      symbol: sanitizeString(vault.symbol || "", 10),
      active: vault.active,
      feeSharingConfirmed: vault.feeSharingConfirmed,
      vaultCreated: vault.vaultCreated,
      graduated: vault.graduated,
    };
  },

  async check_user_claims(_input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    try {
      const res = await crankerGet<any>(`/api/claims/user/${ctx.walletAddress}`);
      if (!res.ok) return { error: "Could not fetch claims" };

      const claims: any[] = (res.data.claims || []).map((c: any) => ({
        mint: c.mint,
        cumulativeAmount: c.cumulativeAmount,
        alreadyClaimed: c.alreadyClaimed,
        claimable: c.claimable,
        claimableSol: (parseInt(c.claimable || "0") / 1e9).toFixed(4),
      }));

      // Enrich with vault names
      if (claims.length > 0) {
        const mints = claims.map((c: any) => c.mint);
        const vaults = await prisma.vault.findMany({
          where: { tokenMint: { in: mints } },
          select: { tokenMint: true, name: true, symbol: true },
        });
        const vaultMap = new Map<string, any>(vaults.map((v: any) => [v.tokenMint, v]));
        for (const claim of claims) {
          const v = vaultMap.get(claim.mint);
          claim.name = sanitizeString(v?.name || "", 32);
          claim.symbol = sanitizeString(v?.symbol || "", 10);
        }
      }

      const totalClaimable = claims.reduce(
        (sum: number, c: any) => sum + parseInt(c.claimable || "0"),
        0
      );

      return {
        claims: claims.filter((c: any) => parseInt(c.claimable || "0") > 0),
        totalClaimableSol: (totalClaimable / 1e9).toFixed(4),
      };
    } catch {
      return { error: "Could not fetch claims" };
    }
  },

  async check_vault_rewards(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    try {
      const res = await crankerGet<any>(
        `/api/claims/proof/${mint.toBase58()}/${ctx.walletAddress}`
      );
      if (!res.ok) return { error: "No rewards found for this vault" };

      const d = res.data;
      return {
        mint: mint.toBase58(),
        claimable: d.claimable,
        claimableSol: (parseInt(d.claimable || "0") / 1e9).toFixed(4),
        cumulativeAmount: d.cumulativeAmount,
        alreadyClaimed: d.alreadyClaimed,
        epochNumber: d.epochNumber,
        expired: d.expired || false,
      };
    } catch {
      return { error: "Could not fetch vault rewards" };
    }
  },

  async prepare_claim(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    try {
      const res = await crankerGet<any>(
        `/api/claims/proof/${mint.toBase58()}/${ctx.walletAddress}`
      );
      if (!res.ok) return { error: "No claimable rewards for this vault" };

      const d = res.data;
      const claimable = parseInt(d.claimable || "0");
      if (claimable <= 0) return { error: "Nothing to claim for this vault" };
      if (d.expired) return { error: "This allocation has expired" };

      // Get vault name for display
      const vault = await prisma.vault.findUnique({
        where: { tokenMint: mint.toBase58() },
        select: { name: true, symbol: true },
      });

      return {
        action: "claim",
        mint: mint.toBase58(),
        name: sanitizeString(vault?.name || "", 32),
        symbol: sanitizeString(vault?.symbol || "", 10),
        claimable: d.claimable,
        claimableSol: (claimable / 1e9).toFixed(4),
        claimData: {
          cumulativeAmount: d.cumulativeAmount,
          proof: d.proof,
        },
      };
    } catch {
      return { error: "Could not prepare claim" };
    }
  },

  async prepare_claim_all(_input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    try {
      const res = await crankerGet<any>(`/api/claims/user/${ctx.walletAddress}`);
      if (!res.ok) return { error: "Could not fetch claims" };

      const claimable = (res.data.claims || []).filter(
        (c: any) => parseInt(c.claimable || "0") > 0
      );

      if (claimable.length === 0) return { error: "No rewards to claim" };

      // Cap to avoid excessive parallel requests
      const toProcess = claimable.slice(0, 20);

      // Batch: fetch all vault names + all proofs in parallel
      const [vaults, ...proofResults] = await Promise.all([
        prisma.vault.findMany({
          where: { tokenMint: { in: toProcess.map((c: any) => c.mint) } },
          select: { tokenMint: true, name: true, symbol: true },
        }),
        ...toProcess.map((c: any) =>
          crankerGet<any>(`/api/claims/proof/${c.mint}/${ctx.walletAddress}`)
            .catch(() => null)
        ),
      ]);

      const vaultMap = new Map<string, any>(vaults.map((v: any) => [v.tokenMint, v]));

      const claims = [];
      for (let i = 0; i < toProcess.length; i++) {
        const c = toProcess[i];
        const proofRes = proofResults[i];
        if (!proofRes || !proofRes.ok || proofRes.data.expired) continue;

        const vault = vaultMap.get(c.mint);
        claims.push({
          mint: c.mint,
          name: sanitizeString(vault?.name || "", 32),
          symbol: sanitizeString(vault?.symbol || "", 10),
          claimable: c.claimable,
          claimableSol: (parseInt(c.claimable || "0") / 1e9).toFixed(4),
          claimData: {
            cumulativeAmount: proofRes.data.cumulativeAmount,
            proof: proofRes.data.proof,
          },
        });
      }

      if (claims.length === 0) return { error: "No valid claims available" };

      const totalLamports = claims.reduce(
        (sum, c) => sum + parseInt(c.claimable || "0"),
        0
      );

      return {
        action: "claim_all",
        claims,
        totalClaimableSol: (totalLamports / 1e9).toFixed(4),
      };
    } catch {
      return { error: "Could not prepare claims" };
    }
  },

  async get_holder_ranking(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    try {
      const res = await crankerGet<any>(`/api/distributions/${mint.toBase58()}`);
      if (!res.ok) return { error: "No distribution data for this vault" };

      const d = res.data;
      const holders = d.topHolders || [];
      const userIndex = holders.findIndex(
        (h: any) => h.wallet === ctx.walletAddress
      );

      if (userIndex === -1) {
        return {
          mint: mint.toBase58(),
          ranked: false,
          totalHolders: d.holderCount || holders.length,
          message: "You are not in the current holder rankings for this vault",
        };
      }

      const user = holders[userIndex];
      return {
        mint: mint.toBase58(),
        ranked: true,
        rank: userIndex + 1,
        score: user.score,
        cumulativeAmount: user.cumulativeAmount,
        cumulativeSol: (parseInt(user.cumulativeAmount || "0") / 1e9).toFixed(4),
        totalHolders: d.holderCount || holders.length,
      };
    } catch {
      return { error: "Could not fetch ranking" };
    }
  },

  async get_distribution_history(input) {
    const mint = parsePubkey(input.mint as string);
    if (!mint) return { error: "Invalid mint address" };

    const limit = Math.min(Math.max((input.limit as number) || 10, 1), 50);

    const vault = await prisma.vault.findUnique({
      where: { tokenMint: mint.toBase58() },
      select: { id: true, name: true, symbol: true },
    });

    if (!vault) return { error: "Vault not found" };

    const distributions = await prisma.distributionRecord.findMany({
      where: { vaultId: vault.id },
      select: {
        epochNumber: true,
        totalAllocated: true,
        holderCount: true,
        txSignature: true,
        createdAt: true,
      },
      orderBy: { epochNumber: "desc" },
      take: limit,
    });

    return {
      mint: mint.toBase58(),
      name: sanitizeString(vault.name || "", 32),
      symbol: sanitizeString(vault.symbol || "", 10),
      epochs: distributions.map((d: any) => ({
        epoch: d.epochNumber,
        totalAllocatedSol: (Number(d.totalAllocated) / 1e9).toFixed(4),
        holderCount: d.holderCount,
        txSignature: d.txSignature,
        createdAt: d.createdAt,
      })),
    };
  },

  // ─── Action Tools ───

  async navigate(input) {
    const page = sanitizeString((input.page as string) || "", 64);
    const validPages: Record<string, string> = {
      launch: "/launch",
      explore: "/explore",
      vaults: "/vaults",
      profile: "/profile",
      docs: "/docs",
    };

    // Handle vault/{mint} pattern
    if (page.startsWith("vault/")) {
      const mintStr = page.slice(6);
      const mint = parsePubkey(mintStr);
      if (!mint) return { error: "Invalid mint in vault path" };
      return { action: "navigate", path: `/vault/${mint.toBase58()}` };
    }

    const path = validPages[page];
    if (!path) return { error: `Unknown page: ${page}. Available: ${Object.keys(validPages).join(", ")}, vault/{mint}` };

    return { action: "navigate", path };
  },

  async start_launch_flow(input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    const prefill: Record<string, string> = {};
    if (input.name) prefill.name = sanitizeString(input.name as string, 32);
    if (input.symbol) prefill.symbol = sanitizeString(input.symbol as string, 10);
    if (input.description) prefill.description = sanitizeString(input.description as string, 500);
    // Only allow http(s) URLs — reject javascript:, data:, etc.
    const safeUrl = (url: string): string | null => {
      const cleaned = sanitizeString(url, 256);
      if (/^https?:\/\//i.test(cleaned)) return cleaned;
      return null;
    };
    if (input.twitter) { const u = safeUrl(input.twitter as string); if (u) prefill.twitter = u; }
    if (input.telegram) { const u = safeUrl(input.telegram as string); if (u) prefill.telegram = u; }
    if (input.website) { const u = safeUrl(input.website as string); if (u) prefill.website = u; }

    return { action: "navigate", path: "/launch", prefill };
  },

  async fund_wallet(_input, ctx) {
    const authErr = requireAuth(ctx);
    if (authErr) return authErr;

    return {
      action: "fund_wallet",
      address: ctx.walletAddress!,
    };
  },

  async explain_concept(input) {
    const concept = (input.concept as string) || "";
    const explanations: Record<string, string> = {
      vault:
        "A vault is like a shared pool for a token. When people trade the token, trading fees go into the vault. The vault then distributes those fees to the token's top holders automatically.",
      merkle_proof:
        "A Merkle proof is a cryptographic receipt that proves you're eligible to claim rewards. It's generated automatically — you don't need to understand the math, just click claim.",
      fee_sharing:
        "Fee sharing means the trading fees generated by a token are automatically split between holders and liquidity. On Anvil, this is set up permanently when a token launches — it can't be turned off.",
      holder_score:
        "Your holder score determines your share of rewards. It's based on two things: how many tokens you hold and how long you've held them. The longer you hold, the higher your score.",
      distribution:
        "A distribution is when the vault calculates everyone's share and publishes the results on-chain. This happens roughly every hour. After a distribution, you can claim your rewards.",
      lp:
        "LP stands for liquidity pool. A portion of trading fees is used to add liquidity on decentralized exchanges, which helps the token trade better and with less price impact.",
      creator_fees:
        "Creator fees are a small percentage charged on every trade of a token. On supported launchpads, these fees are collected and routed to the Anvil vault for distribution to holders.",
      claim:
        "Claiming is how you collect your rewards. When you have claimable SOL in a vault, you can claim it — the SOL goes directly to your wallet. You can claim anytime after a distribution.",
    };

    const explanation = explanations[concept];
    if (!explanation) {
      return {
        error: `Unknown concept. Available: ${Object.keys(explanations).join(", ")}`,
      };
    }

    return { concept, explanation };
  },
};

// ─── Tool Executor ───

const MAX_TOOL_ROUNDS = 5;

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: RequestContext
): Promise<string> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    console.error(`[chat] Unknown tool called: ${toolName}`);
    return sanitizeToolResult({ error: "Unknown tool" });
  }

  console.log(`[chat:tool] ${toolName} user=${ctx.userId || "anon"}`);

  try {
    const result = await handler(toolInput, ctx);
    return sanitizeToolResult(result);
  } catch (err) {
    console.error(`[chat:tool:${toolName}] Error:`, err);
    return sanitizeToolResult({ error: "Something went wrong. Try again." });
  }
}

export { MAX_TOOL_ROUNDS };
