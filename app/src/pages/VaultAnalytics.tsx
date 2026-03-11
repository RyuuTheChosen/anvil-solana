import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { lamportsToSol, shortenAddress } from "../lib/format.ts";
import { isValidBase58 } from "../lib/validate.ts";
import { apiFetch } from "../lib/api.ts";

interface EpochData {
  epoch: number;
  totalAllocated: string;
  epochAmount: string;
  holderCount: number;
  createdAt: string;
  txSignature: string | null;
}

interface LpOperation {
  type: string;
  solAmount: string;
  lpTokens: string;
  status: string;
  txSignatures: string[];
  createdAt: string;
}

interface LpData {
  graduated: boolean;
  graduatedAt: string | null;
  lpDeployed: boolean;
  lpPoolKey: string | null;
  totalLpSolDeposited: string;
  currentLpTokenBalance: string;
  lpDepositedCostBasis: string;
  pendingLpSol: string;
  totalPlatformFees: string;
  holderSplitBps: number;
  platformFeeBps: number;
  operations: LpOperation[];
}

interface AnalyticsData {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  creator: string;
  vaultCreatedAt: string;
  epochs: EpochData[];
  lp?: LpData;
}

export function VaultAnalytics() {
  const { mint } = useParams<{ mint: string }>();
  const shortMint = mint ? `${mint.slice(0, 6)}...${mint.slice(-4)}` : "---";

  if (!mint || !isValidBase58(mint)) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-12 text-center">
          <p className="mb-2 font-semibold text-white">Invalid vault address</p>
          <p className="text-sm text-pump-muted">The mint address in the URL is not a valid Solana address.</p>
          <Link to="/explore" className="mt-6 inline-block rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08]">
            Browse Vaults
          </Link>
        </div>
      </div>
    );
  }

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/explore/vault/${mint}/analytics`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mint]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="mb-8 flex items-center gap-2 text-xs text-pump-muted">
          <div className="skeleton h-3 w-48" />
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="skeleton mb-4 h-4 w-32" />
              <div className="skeleton h-48 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-12 text-center">
          <p className="mb-2 font-semibold text-white">Failed to load analytics</p>
          <p className="text-sm text-pump-muted">{error || "Unknown error"}</p>
          <Link to={`/vault/${mint}`} className="mt-6 inline-block rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08]">
            Back to Vault
          </Link>
        </div>
      </div>
    );
  }

  const hasEpochs = data.epochs.length > 0;

  // Summary stats
  const totalRevenue = hasEpochs ? data.epochs[data.epochs.length - 1].totalAllocated : "0";
  const currentHolders = hasEpochs ? data.epochs[data.epochs.length - 1].holderCount : 0;
  const totalEpochs = data.epochs.length;
  const avgPerEpoch = hasEpochs
    ? (Number(totalRevenue) / totalEpochs / 1e9).toFixed(4)
    : "0";

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
      {/* Breadcrumb */}
      <div className="animate-fade-in mb-8 flex items-center gap-2 text-xs text-pump-muted">
        <Link to="/explore" className="transition-colors hover:text-white">Explore</Link>
        <Chevron />
        <Link to={`/vault/${mint}`} className="transition-colors hover:text-white">{data.name || shortMint}</Link>
        <Chevron />
        <span className="text-white">Analytics</span>
      </div>

      {/* Header */}
      <div className="animate-slide-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pump-border bg-gradient-to-br from-pump-green/15 to-pump-accent/10 text-lg font-bold text-white overflow-hidden">
            {data.imageUrl ? (
              <img src={data.imageUrl} alt={data.symbol} className="h-full w-full object-cover" loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.textContent = data.symbol?.charAt(0) || "?"; }} />
            ) : (
              data.symbol?.charAt(0) || "?"
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{data.name} Analytics</h1>
            <p className="font-mono text-xs text-pump-muted">${data.symbol} · {shortMint}</p>
          </div>
        </div>
        <Link to={`/vault/${mint}`} className="inline-flex items-center gap-2 rounded-lg border border-pump-border bg-pump-card px-4 py-2 text-xs font-medium text-pump-text transition-colors hover:border-pump-border-light hover:text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Vault
        </Link>
      </div>

      {/* Summary cards */}
      <div className="animate-slide-up stagger-1 mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Total Revenue" value={`${lamportsToSol(totalRevenue)} SOL`} color="green" />
        <SummaryCard label="Distributions" value={String(totalEpochs)} />
        <SummaryCard label="Current Holders" value={String(currentHolders)} />
        <SummaryCard label="Avg / Epoch" value={`${avgPerEpoch} SOL`} color="cyan" />
      </div>

      {!hasEpochs ? (
        <div className="animate-slide-up stagger-2 rounded-2xl border border-pump-border bg-pump-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pump-border/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
          <p className="mb-1 font-semibold text-white">No distributions yet</p>
          <p className="text-sm text-pump-muted">Analytics will appear after the first distribution epoch.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue over time */}
          <div className="animate-slide-up stagger-2 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-pump-green/30 to-transparent" />
            <div className="p-6">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                Cumulative Revenue
              </h3>
              <p className="mb-6 text-xs text-pump-muted">Total SOL allocated to holders over time</p>
              <AreaChart
                data={data.epochs.map((e) => ({ label: `#${e.epoch}`, value: Number(e.totalAllocated) / 1e9 }))}
                color="pump-green"
                suffix=" SOL"
              />
            </div>
          </div>

          {/* Per-epoch distribution */}
          <div className="animate-slide-up stagger-3 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-pump-accent/30 to-transparent" />
            <div className="p-6">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-accent"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                Revenue per Epoch
              </h3>
              <p className="mb-6 text-xs text-pump-muted">SOL distributed in each epoch</p>
              <BarChart
                data={data.epochs.map((e) => ({ label: `#${e.epoch}`, value: Number(e.epochAmount) / 1e9 }))}
                color="pump-accent"
                suffix=" SOL"
              />
            </div>
          </div>

          {/* Holder count over time */}
          <div className="animate-slide-up stagger-4 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-pump-cyan/30 to-transparent" />
            <div className="p-6">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                Holder Count
              </h3>
              <p className="mb-6 text-xs text-pump-muted">Eligible holders at each distribution</p>
              <AreaChart
                data={data.epochs.map((e) => ({ label: `#${e.epoch}`, value: e.holderCount }))}
                color="pump-cyan"
              />
            </div>
          </div>

          {/* LP Analytics */}
          {data.lp && <LpAnalyticsSection lp={data.lp} />}

          {/* Distribution history table */}
          <div className="animate-slide-up stagger-5 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-pump-border/50 px-6 py-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pump-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Distribution History
              </h3>
              <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-pump-muted">
                {data.epochs.length} epochs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pump-border/30 text-[10px] font-medium uppercase tracking-wider text-pump-muted">
                    <th className="px-3 py-3 sm:px-6">Epoch</th>
                    <th className="px-3 py-3 sm:px-6">Date</th>
                    <th className="px-3 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-3 py-3 text-right sm:px-6">Cumulative</th>
                    <th className="px-3 py-3 text-right sm:px-6">Holders</th>
                    <th className="px-3 py-3 text-right sm:px-6">TX</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.epochs].reverse().map((e) => (
                    <tr key={e.epoch} className="border-b border-pump-border/10 transition-colors hover:bg-white/[0.02]">
                      <td className="px-3 py-3 font-mono font-bold text-white sm:px-6">#{e.epoch}</td>
                      <td className="px-3 py-3 text-pump-muted sm:px-6">{formatDate(e.createdAt)}</td>
                      <td className="px-3 py-3 text-right font-mono text-pump-green sm:px-6">+{(Number(e.epochAmount) / 1e9).toFixed(4)}</td>
                      <td className="px-3 py-3 text-right font-mono text-white sm:px-6">{lamportsToSol(e.totalAllocated)}</td>
                      <td className="px-3 py-3 text-right text-pump-text sm:px-6">{e.holderCount}</td>
                      <td className="px-3 py-3 text-right sm:px-6">
                        {e.txSignature ? (
                          <a href={`https://solscan.io/tx/${e.txSignature}`} target="_blank" rel="noopener noreferrer"
                            className="text-pump-accent transition-colors hover:text-pump-pink">
                            View
                          </a>
                        ) : (
                          <span className="text-pump-muted">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LP Analytics Section ─────────────────────────────────────

const LP_THRESHOLD_LAMPORTS = 1_000_000_000; // 1 SOL

function LpAnalyticsSection({ lp }: { lp: LpData }) {
  const pendingNum = Number(lp.pendingLpSol);
  const progressPct = Math.min((pendingNum / LP_THRESHOLD_LAMPORTS) * 100, 100);

  return (
    <>
      {/* LP Status Card */}
      <div className="animate-slide-up stagger-4 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-pump-cyan/30 to-transparent" />
        <div className="p-6">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
            LP Analytics
          </h3>
          <p className="mb-6 text-xs text-pump-muted">Liquidity pool status and fee breakdown</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Graduation status */}
            <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Graduation</p>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${lp.graduated ? "bg-pump-green" : "bg-yellow-500"}`} />
                <span className="font-mono text-sm font-bold text-white">
                  {lp.graduated ? "Graduated" : "Not Graduated"}
                </span>
              </div>
              {lp.graduated && lp.graduatedAt && (
                <p className="mt-1 text-[10px] text-pump-muted">{formatDate(lp.graduatedAt)}</p>
              )}
            </div>

            {/* LP Deployment status */}
            <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">LP Status</p>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${lp.lpDeployed ? "bg-pump-cyan" : "bg-orange-500 animate-pulse"}`} />
                <span className="font-mono text-sm font-bold text-white">
                  {lp.lpDeployed ? "Deployed" : "Pending"}
                </span>
              </div>
              {!lp.lpDeployed && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-pump-muted">
                    <span>Progress to deploy</span>
                    <span className="font-mono">{lamportsToSol(lp.pendingLpSol)} / 1.0000 SOL</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-pump-border/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pump-cyan/60 to-pump-cyan transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {lp.lpDeployed && lp.lpPoolKey && (
                <a
                  href={`https://solscan.io/account/${lp.lpPoolKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-pump-cyan transition-colors hover:text-white"
                >
                  Pool: {shortenAddress(lp.lpPoolKey)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>

            {/* Pending LP SOL (when deployed, show total deposited instead) */}
            {lp.lpDeployed ? (
              <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Total SOL Deposited</p>
                <p className="font-mono text-lg font-bold text-pump-cyan">{lamportsToSol(lp.totalLpSolDeposited)} SOL</p>
                <p className="mt-1 text-[10px] text-pump-muted">LP Tokens: {Number(lp.currentLpTokenBalance).toLocaleString()}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Pending LP SOL</p>
                <p className="font-mono text-lg font-bold text-pump-cyan">{lamportsToSol(lp.pendingLpSol)} SOL</p>
              </div>
            )}

            {/* Platform Fees */}
            <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Platform Fees</p>
              <p className="font-mono text-lg font-bold text-white">{lamportsToSol(lp.totalPlatformFees)} SOL</p>
              <p className="mt-1 text-[10px] text-pump-muted">{(lp.platformFeeBps / 100).toFixed(1)}% fee rate</p>
            </div>

            {/* Holder Split */}
            <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Holder / LP Split</p>
              <p className="font-mono text-lg font-bold text-white">
                {(lp.holderSplitBps / 100).toFixed(0)}% / {(100 - lp.holderSplitBps / 100).toFixed(0)}%
              </p>
              <p className="mt-1 text-[10px] text-pump-muted">Holders vs LP allocation</p>
            </div>

            {/* Cost Basis (only if deployed) */}
            {lp.lpDeployed && (
              <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">LP Cost Basis</p>
                <p className="font-mono text-lg font-bold text-white">{lamportsToSol(lp.lpDepositedCostBasis)} SOL</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LP Operations History */}
      {lp.operations.length > 0 && (
        <div className="animate-slide-up stagger-5 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-pump-cyan/30 to-transparent" />
          <div className="flex items-center justify-between border-b border-pump-border/50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pump-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              LP Operations
            </h3>
            <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-pump-muted">
              {lp.operations.length} ops
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-pump-border/30 text-[10px] font-medium uppercase tracking-wider text-pump-muted">
                  <th className="px-3 py-3 sm:px-6">Type</th>
                  <th className="px-3 py-3 sm:px-6">Date</th>
                  <th className="px-3 py-3 text-right sm:px-6">SOL Amount</th>
                  <th className="px-3 py-3 text-right sm:px-6">LP Tokens</th>
                  <th className="px-3 py-3 text-right sm:px-6">Status</th>
                  <th className="px-3 py-3 text-right sm:px-6">TX</th>
                </tr>
              </thead>
              <tbody>
                {lp.operations.map((op, i) => (
                  <tr key={i} className="border-b border-pump-border/10 transition-colors hover:bg-white/[0.02]">
                    <td className="px-3 py-3 sm:px-6">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        op.type === "DEPLOY"
                          ? "bg-pump-cyan/10 text-pump-cyan"
                          : "bg-pump-accent/10 text-pump-accent"
                      }`}>
                        {op.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-pump-muted sm:px-6">{formatDate(op.createdAt)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white sm:px-6">{lamportsToSol(op.solAmount)}</td>
                    <td className="px-3 py-3 text-right font-mono text-pump-text sm:px-6">{Number(op.lpTokens).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right sm:px-6">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        op.status === "SUCCESS"
                          ? "bg-pump-green/10 text-pump-green"
                          : op.status === "FAILED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {op.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-6">
                      {op.txSignatures.length > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {op.txSignatures.map((sig, j) => (
                            <a
                              key={j}
                              href={`https://solscan.io/tx/${sig}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pump-cyan transition-colors hover:text-white"
                            >
                              {shortenAddress(sig, 4, 4)}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-pump-muted">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Chart Components ────────────────────────────────────────

interface ChartPoint {
  label: string;
  value: number;
}

const CHART_H = 200;
const CHART_PAD = { top: 20, right: 16, bottom: 32, left: 60 };

function AreaChart({ data, color, suffix = "" }: { data: ChartPoint[]; color: string; suffix?: string }) {
  if (data.length === 0) return null;

  const colorVar = `var(--color-${color})`;
  const maxVal = Math.max(...data.map((d) => d.value), 0.0001);
  const w = 100; // percentage-based viewBox
  const h = CHART_H;
  const plotW = w;
  const plotH = h - CHART_PAD.top - CHART_PAD.bottom;

  const points = data.map((d, i) => ({
    x: CHART_PAD.left + (i / Math.max(data.length - 1, 1)) * (plotW * 6 - CHART_PAD.left - CHART_PAD.right),
    y: CHART_PAD.top + plotH - (d.value / maxVal) * plotH,
  }));

  const totalW = plotW * 6;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_PAD.top + plotH} L${points[0].x},${CHART_PAD.top + plotH} Z`;

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = (maxVal / yTicks) * i;
    const y = CHART_PAD.top + plotH - (i / yTicks) * plotH;
    return { val, y };
  });

  // Show up to 8 x-axis labels
  const xStep = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} ${h}`} className="w-full min-w-[480px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLines.map(({ val, y }, i) => (
          <g key={i}>
            <line x1={CHART_PAD.left} y1={y} x2={totalW - CHART_PAD.right} y2={y} stroke="var(--color-pump-border)" strokeWidth="0.5" strokeDasharray={i === 0 ? "0" : "4 4"} />
            <text x={CHART_PAD.left - 6} y={y + 3} textAnchor="end" fill="var(--color-pump-muted)" fontSize="9" fontFamily="monospace">
              {formatChartValue(val)}{suffix}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad-${color})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={colorVar} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--color-pump-dark)" stroke={colorVar} strokeWidth="1.5" />
            {/* Tooltip on hover via title */}
            <title>{data[i].label}: {data[i].value.toFixed(4)}{suffix}</title>
            {/* Invisible hover target */}
            <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % xStep !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={points[i].x} y={h - 6} textAnchor="middle" fill="var(--color-pump-muted)" fontSize="9" fontFamily="monospace">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function BarChart({ data, color, suffix = "" }: { data: ChartPoint[]; color: string; suffix?: string }) {
  if (data.length === 0) return null;

  const colorVar = `var(--color-${color})`;
  const maxVal = Math.max(...data.map((d) => d.value), 0.0001);
  const h = CHART_H;
  const plotH = h - CHART_PAD.top - CHART_PAD.bottom;
  const totalW = Math.max(data.length * 40, 480);
  const barW = Math.min(24, (totalW - CHART_PAD.left - CHART_PAD.right) / data.length * 0.7);
  const gap = (totalW - CHART_PAD.left - CHART_PAD.right) / data.length;

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = (maxVal / yTicks) * i;
    const y = CHART_PAD.top + plotH - (i / yTicks) * plotH;
    return { val, y };
  });

  const xStep = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} ${h}`} className="w-full min-w-[480px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`bar-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLines.map(({ val, y }, i) => (
          <g key={i}>
            <line x1={CHART_PAD.left} y1={y} x2={totalW - CHART_PAD.right} y2={y} stroke="var(--color-pump-border)" strokeWidth="0.5" strokeDasharray={i === 0 ? "0" : "4 4"} />
            <text x={CHART_PAD.left - 6} y={y + 3} textAnchor="end" fill="var(--color-pump-muted)" fontSize="9" fontFamily="monospace">
              {formatChartValue(val)}{suffix}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * plotH;
          const x = CHART_PAD.left + i * gap + (gap - barW) / 2;
          const y = CHART_PAD.top + plotH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="3" fill={`url(#bar-grad-${color})`} className="transition-opacity hover:opacity-80" />
              <title>{d.label}: {d.value.toFixed(4)}{suffix}</title>
              {(i % xStep === 0 || i === data.length - 1) && (
                <text x={x + barW / 2} y={h - 6} textAnchor="middle" fill="var(--color-pump-muted)" fontSize="9" fontFamily="monospace">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorCls = color === "green" ? "text-pump-green" : color === "cyan" ? "text-pump-cyan" : "text-white";
  return (
    <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">{label}</p>
      <p className={`font-mono text-lg font-bold ${colorCls}`}>{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatChartValue(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(3);
  return v.toFixed(4);
}
