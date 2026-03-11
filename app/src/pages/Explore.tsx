import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { CopyButton } from "../components/CopyButton";
import { TradeDropdown } from "../components/TradeLinks";

interface TokenInfo {
  mint: string;
  bondingCurve: string | null;
  name: string;
  symbol: string;
  imageUrl: string | null;
  creator: string;
  holderCount: number;
  totalDistributed: string;
  epochCount: number;
  lastDistributionAt: string | null;
  createdAt: number;
}

type SortKey = "totalDistributed" | "holderCount" | "createdAt";

const sortLabels: Record<SortKey, string> = {
  totalDistributed: "Distributed",
  holderCount: "Holders",
  createdAt: "Newest",
};

const PAGE_SIZE = 24;

export function Explore() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("totalDistributed");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTokens() {
      try {
        const res = await apiFetch(`/api/explore/tokens?limit=${PAGE_SIZE}`);
        if (!res.ok) throw new Error("Failed to fetch tokens");
        const data = await res.json();
        if (!cancelled) {
          setTokens(data.tokens || []);
          setNextCursor(data.nextCursor ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTokens();
    const interval = setInterval(fetchTokens, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/explore/tokens?limit=${PAGE_SIZE}&cursor=${nextCursor}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      setTokens((prev) => [...prev, ...(data.tokens || [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // silently fail, user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  const getSortValue = (token: TokenInfo): number => {
    if (sortBy === "totalDistributed") return parseFloat(token.totalDistributed) || 0;
    if (sortBy === "holderCount") return token.holderCount;
    return token.createdAt;
  };

  const filtered = tokens
    .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => getSortValue(b) - getSortValue(a));

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
      {/* Header */}
      <div className="animate-slide-up mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pump-cyan/10 text-pump-cyan">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Explore Tokens</h1>
          </div>
          <p className="text-sm text-pump-muted">Browse tokens with active fee sharing vaults.</p>
        </div>
        <Link
          to="/launch"
          className="btn-glow group inline-flex items-center gap-2 rounded-xl bg-pump-green px-5 py-2.5 text-xs font-bold text-pump-dark transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Launch Token
        </Link>
      </div>

      {/* Filters bar */}
      <div className="animate-slide-up stagger-1 mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pump-muted/50 transition-colors peer-focus:text-pump-green">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="peer w-full rounded-xl border border-pump-border bg-pump-card py-3 pl-10 pr-4 text-sm text-white placeholder:text-pump-muted/50 transition-all focus:border-pump-green/30 focus:bg-pump-card-hover focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,255,136,0.05)]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-pump-muted transition-colors hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5 rounded-xl border border-pump-border bg-pump-card p-1">
          {(Object.keys(sortLabels) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 ${
                sortBy === key
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-pump-muted hover:text-white"
              }`}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="animate-slide-up stagger-2 mb-4 flex items-center justify-between">
        <p className="text-xs text-pump-muted">
          {filtered.length} {filtered.length === 1 ? "token" : "tokens"} found
        </p>
        {!loading && !error && (
          <div className="flex items-center gap-1.5 text-[11px] text-pump-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-green" />
            Live data
          </div>
        )}
      </div>

      {/* Loading / Error states */}
      {loading ? (
        <div className="animate-scale-in rounded-2xl border border-pump-border bg-pump-card p-16 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-pump-green border-t-transparent" />
          <p className="text-sm text-pump-muted">Loading tokens...</p>
        </div>
      ) : error ? (
        <div className="animate-scale-in rounded-2xl border border-pump-border bg-pump-card p-16 text-center">
          <p className="mb-2 font-medium text-red-400">Failed to load tokens</p>
          <p className="text-sm text-pump-muted">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-scale-in rounded-2xl border border-pump-border bg-pump-card p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pump-border/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="mb-1 font-medium text-white">No tokens found</p>
          <p className="text-sm text-pump-muted">
            {tokens.length === 0 ? "No tokens have been launched yet. Be the first!" : "Try a different search."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((token, i) => (
              <div key={token.mint} className={`animate-slide-up stagger-${Math.min(i + 1, 6)}`}>
                <VaultCard token={token} rank={i + 1} />
              </div>
            ))}
          </div>

          {nextCursor && !search && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-pump-border bg-pump-card px-6 py-3 text-sm font-medium text-pump-text transition-all hover:border-pump-border-light hover:text-white disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDistributed(lamportsStr: string): string {
  const lamports = parseFloat(lamportsStr) || 0;
  const sol = lamports / 1e9;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k`;
  if (sol >= 1) return sol.toFixed(1);
  if (sol > 0) return sol.toFixed(3);
  return "0";
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "No distributions yet";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function VaultCard({ token, rank }: { token: TokenInfo; rank: number }) {
  const distributed = formatDistributed(token.totalDistributed);

  return (
    <Link
      to={`/vault/${token.mint}`}
      className="card-interactive group block rounded-2xl border border-pump-border bg-pump-card overflow-hidden"
    >
      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pump-green/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Top row */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pump-green/15 to-pump-accent/10 text-sm font-bold text-white ring-1 ring-white/5 overflow-hidden">
              {token.imageUrl ? (
                <img
                  src={token.imageUrl}
                  alt={token.symbol}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.textContent = token.symbol.charAt(0);
                  }}
                />
              ) : (
                token.symbol.charAt(0)
              )}
              {rank <= 3 && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pump-dark text-[8px]">
                  {rank === 1 ? "\u{1F947}" : rank === 2 ? "\u{1F948}" : "\u{1F949}"}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-pump-green">{token.name}</p>
              <p className="font-mono text-[11px] text-pump-muted">${token.symbol}</p>
            </div>
          </div>
          <span className="rounded-md bg-pump-green/[0.06] px-2 py-1 font-mono text-[11px] font-medium text-pump-green">
            Epoch {token.epochCount}
          </span>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <MiniStat label="Distributed" value={distributed} unit="SOL" />
          <MiniStat label="Holders" value={String(token.holderCount)} />
          <MiniStat label="Epochs" value={String(token.epochCount)} />
        </div>

        {/* Distribution bar */}
        <div className="mb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-pump-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pump-green/60 to-pump-green transition-all duration-500"
              style={{ width: `${Math.min((parseFloat(token.totalDistributed) / 1e9 / 600) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-pump-border/40 pt-4">
          <span className="flex items-center gap-1.5 text-[10px] text-pump-muted">
            Last epoch: {timeAgo(token.lastDistributionAt)}
            <CopyButton text={token.mint} label="mint" />
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-green" />
              <span className="text-[10px] font-medium text-pump-green">Active</span>
            </span>
            <TradeDropdown mint={token.mint} bondingCurve={token.bondingCurve} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-white">
        {value}
        {unit && <span className="ml-0.5 text-[10px] text-pump-muted">{unit}</span>}
      </p>
      <p className="text-[10px] text-pump-muted">{label}</p>
    </div>
  );
}
