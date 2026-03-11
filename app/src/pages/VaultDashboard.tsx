import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { PublicKey } from "@solana/web3.js";
import {
  fetchDistribution,
  fetchClaimData,
  fetchPushHistory,
  deriveVaultPda,
  deriveVaultPoolPda,
  deriveDistributionPda,
  type DistributionData,
  type ClaimData,
  type PushHistory,
} from "../lib/anvilProgram.ts";
import { lamportsToSol, shortenAddress } from "../lib/format.ts";
import { isValidBase58 } from "../lib/validate.ts";
import { apiFetch, authApiFetch, custodialClaimSignAndSubmit, sanitizeError } from "../lib/api.ts";
import { CopyButton } from "../components/CopyButton.tsx";
import { TradeButtons } from "../components/TradeLinks.tsx";
import { useToast } from "../components/Toast.tsx";

interface VaultMeta {
  name: string;
  symbol: string;
  imageUrl: string | null;
  creator: string;
  bondingCurve: string | null;
  maxHolders: number;
}

interface SplitConfig {
  holderSplitBps: number;
  platformFeeBps: number;
  platformPct: number;
  holderPct: number;
  lpPct: number;
  buybackEnabled: boolean;
  buybackSplitBps: number;
  buybackAction: string;
  buybackPct: number;
  pendingBuybackSol: string;
  totalBuybackSol: string;
  buybackTokenBalance: string;
  pendingSplitBps: number | null;
  splitEffectiveAt: string | null;
  graduated: boolean;
  lpDeployed: boolean;
  lpPoolKey: string | null;
  pendingLpSol: string;
  totalPlatformFees: string;
  claimExpiryHours: number | null;
  distributionMode?: string;
}

export function VaultDashboard() {
  const { mint } = useParams<{ mint: string }>();
  const { publicKey, getAccessToken } = useAnvilWallet();
  const { toast } = useToast();
  const shortMint = mint ? `${mint.slice(0, 6)}...${mint.slice(-4)}` : "---";

  // Validate mint param from URL
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

  interface EpochSummary { epoch: number; epochAmount: string; holderCount: number; createdAt: string; }
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [dist, setDist] = useState<DistributionData | null>(null);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [splitConfig, setSplitConfig] = useState<SplitConfig | null>(null);
  const [recentEpochs, setRecentEpochs] = useState<EpochSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [pushHistory, setPushHistory] = useState<PushHistory | null>(null);

  useEffect(() => {
    if (!mint) return;
    setLoading(true);
    const promises: Promise<void>[] = [
      fetchDistribution(mint).then(setDist).catch(() => setDist(null)),
      apiFetch(`/api/explore/vault/${mint}`)
        .then((r) => r.ok ? r.json() : null)
        .then(setMeta)
        .catch(() => setMeta(null)),
      apiFetch(`/api/explore/vault/${mint}/analytics`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.epochs) setRecentEpochs(data.epochs.slice(-5).reverse()); })
        .catch(() => {}),
      apiFetch(`/api/vault/split/${mint}`)
        .then((r) => r.ok ? r.json() : null)
        .then(setSplitConfig)
        .catch(() => setSplitConfig(null)),
    ];
    if (publicKey) {
      promises.push(fetchClaimData(mint, publicKey.toBase58()).then(setClaim).catch(() => setClaim(null)));
      promises.push(fetchPushHistory(mint, publicKey.toBase58()).then(setPushHistory).catch(() => setPushHistory(null)));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [mint, publicKey]);

  const handleClaim = async () => {
    if (!mint || !publicKey || !claim || claim.claimable === "0" || claiming) return;
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { signature } = await custodialClaimSignAndSubmit(token, mint);
      setClaimSuccess(signature);
      toast("success", `Claimed ${claimableSol} SOL`, { label: "View TX", href: `https://solscan.io/tx/${signature}` });
      const updated = await fetchClaimData(mint, publicKey.toBase58());
      setClaim(updated);
    } catch (err: unknown) {
      const msg = sanitizeError(err instanceof Error ? err.message : "Claim failed");
      setClaimError(msg);
      toast("error", msg);
    } finally {
      setClaiming(false);
    }
  };

  const isPushMode = splitConfig?.distributionMode === "push";
  const claimableSol = claim ? lamportsToSol(claim.claimable) : "0";
  const hasClaimable = claim && claim.claimable !== "0";
  const totalReceivedSol = pushHistory ? lamportsToSol(pushHistory.totalReceived) : "0";

  const vaultPdas = useMemo(() => {
    if (!mint) return null;
    try {
      const mintKey = new PublicKey(mint);
      return {
        vault: deriveVaultPda(mintKey)[0].toBase58(),
        pool: deriveVaultPoolPda(mintKey)[0].toBase58(),
        distribution: deriveDistributionPda(mintKey)[0].toBase58(),
      };
    } catch { return null; }
  }, [mint]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
      {/* Breadcrumb */}
      <div className="animate-fade-in mb-8 flex items-center gap-2 text-xs text-pump-muted">
        <Link to="/explore" className="transition-colors hover:text-white">Explore</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        <span className="text-white">{meta?.name || shortMint}</span>
      </div>

      {/* Header card */}
      <div className="animate-slide-up mb-8 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
        {/* Top gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-pump-green/30 to-transparent" />

        <div className="p-7">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-pump-border bg-gradient-to-br from-pump-green/15 to-pump-accent/10 text-xl font-bold text-white overflow-hidden">
                {meta?.imageUrl ? (
                  <img
                    src={meta.imageUrl}
                    alt={meta.symbol}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.textContent = meta.symbol?.charAt(0) || "?";
                    }}
                  />
                ) : (
                  meta?.symbol?.charAt(0) || (mint ? mint[0].toUpperCase() : "?")
                )}
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-pump-card bg-pump-green">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06060b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{meta?.name || "Vault"}</h1>
                <p className="flex items-center gap-1.5 font-mono text-xs text-pump-muted">
                  {meta?.symbol ? `$${meta.symbol} · ` : ""}{shortMint}
                  <CopyButton text={mint} label="mint address" />
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TradeButtons mint={mint} bondingCurve={meta?.bondingCurve} />
              <Link
                to={`/vault/${mint}/analytics`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-pump-border bg-pump-dark/50 px-3 py-1.5 text-[11px] font-medium text-pump-text transition-colors hover:border-pump-border-light hover:text-white"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                Analytics
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-pump-green/15 bg-pump-green/[0.06] px-3 py-1.5 text-[11px] font-medium text-pump-green">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-green" />
                Active
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
                  <div className="skeleton mb-2 h-3 w-16" />
                  <div className="skeleton h-6 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatBox label="Total Allocated" value={`${lamportsToSol(dist?.totalAllocated ?? "0")} SOL`} color="green" icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              } />
              <StatBox label={isPushMode ? "Distributions" : "Merkle Updates"} value={String(dist?.epochCount ?? 0)} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              } />
              <StatBox label="Top Earners" value={String(dist?.holderCount ?? 0)} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              } />
              <StatBox
                label={isPushMode ? "Total Received" : "Your Claimable"}
                value={publicKey ? (isPushMode ? `${totalReceivedSol} SOL` : `${claimableSol} SOL`) : "Connect wallet"}
                color={isPushMode ? (pushHistory && pushHistory.totalReceived !== "0" ? "cyan" : undefined) : (hasClaimable ? "cyan" : undefined)}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Rewards section — push mode or claim mode */}
      {publicKey && isPushMode && pushHistory && (
        <div className="animate-slide-up stagger-1 mb-8 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
          {pushHistory.totalReceived !== "0" && <div className="h-px bg-gradient-to-r from-transparent via-pump-cyan/30 to-transparent" />}
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Your Rewards
                </h3>
                <p className="text-xs text-pump-muted">
                  Total received: <span className="text-white">{totalReceivedSol} SOL</span>
                </p>
              </div>
              <div className="rounded-lg border border-pump-green/15 bg-pump-green/[0.06] px-4 py-2.5">
                <p className="text-[11px] text-pump-green">Rewards are automatically sent to your wallet</p>
              </div>
            </div>

            {pushHistory.pushes.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Recent Distributions</p>
                {pushHistory.pushes.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-pump-dark/40 px-3 py-2">
                    <span className="text-[10px] text-pump-muted">{new Date(p.pushedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-pump-green">+{lamportsToSol(p.amount)} SOL</span>
                      {p.txSignature && (
                        <a href={`https://solscan.io/tx/${p.txSignature}`} target="_blank" rel="noopener noreferrer" className="text-pump-muted transition-colors hover:text-white">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {publicKey && !isPushMode && claim && (
        <div className="animate-slide-up stagger-1 mb-8 rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
          {hasClaimable && <div className="h-px bg-gradient-to-r from-transparent via-pump-cyan/30 to-transparent" />}
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Claim Your SOL
                </h3>
                <p className="text-xs text-pump-muted">
                  Total earned: <span className="text-white">{lamportsToSol(claim.cumulativeAmount)} SOL</span> · Already claimed: <span className="text-white">{lamportsToSol(claim.alreadyClaimed)} SOL</span>
                </p>
              </div>
              <button
                onClick={handleClaim}
                disabled={!hasClaimable || claiming}
                className={`btn-glow rounded-xl px-8 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  hasClaimable
                    ? "bg-pump-green text-pump-dark hover:shadow-[0_0_30px_rgba(0,255,136,0.2)]"
                    : "bg-pump-border text-pump-muted"
                }`}
              >
                {claiming ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                    Claiming...
                  </span>
                ) : hasClaimable ? `Claim ${claimableSol} SOL` : "Nothing to claim"}
              </button>
            </div>

            {claim?.expired && (
              <div className="animate-scale-in mt-4 rounded-lg border border-pump-accent/15 bg-pump-accent/[0.06] px-4 py-3 text-sm text-pump-accent">
                Your allocation has expired and been redistributed to active holders.
              </div>
            )}
            {!claim?.expired && claim?.expiresAt && (
              <div className="animate-scale-in mt-4 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-3 text-sm text-yellow-400">
                You no longer hold this token. Unclaimed rewards expire {formatExpiryCountdown(claim.expiresAt)}.
              </div>
            )}
            {claimError && (
              <div className="animate-scale-in mt-4 rounded-lg border border-red-500/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
                {claimError}
              </div>
            )}
            {claimSuccess && (
              <div className="animate-scale-in mt-4 rounded-lg border border-pump-green/15 bg-pump-green/[0.06] px-4 py-3 text-sm text-pump-green">
                Claimed successfully!{" "}
                <a href={`https://solscan.io/tx/${claimSuccess}`} target="_blank" rel="noopener noreferrer" className="underline">View TX</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sidebar */}
        <div className="animate-slide-up stagger-2 space-y-6 md:col-span-1">
          <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-pump-muted">Vault Parameters</h3>
            <div className="space-y-4">
              <ParamRow label="Cycle Interval" value="1 hour" />
              <ParamRow label="Max Holders" value={String(meta?.maxHolders ?? 100)} />
              <ParamRow label="Dust Threshold" value="0.01 SOL" />
              <ParamRow label={isPushMode ? "Dust Expiry" : "Claim Expiry"} value={formatExpiryHours(splitConfig?.claimExpiryHours)} />
            </div>
          </div>

          {/* On-Chain Fee Flow */}
          {vaultPdas && (
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-pump-muted">On-Chain Fee Flow</h3>
              <div className="flex flex-col items-center">
                <FlowNode
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>}
                  label="Vault"
                  sublabel="Fee receiver"
                  address={vaultPdas.vault}
                  color="green"
                />
                <FlowConnector />
                <FlowNode
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
                  label="Vault Pool"
                  sublabel="SOL reserve"
                  address={vaultPdas.pool}
                  color="cyan"
                />
                <FlowConnector />
                <FlowNode
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>}
                  label="Distribution"
                  sublabel={isPushMode ? "Auto-push" : "Merkle root"}
                  address={vaultPdas.distribution}
                  color="accent"
                />
                <FlowConnector />
                <FlowEndNode holderCount={dist?.holderCount ?? 0} isPushMode={isPushMode} />
              </div>
            </div>
          )}

          {/* Fee Split Config */}
          {splitConfig && (
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">Fee Split</h3>
              {/* Visual bar */}
              <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-pump-dark flex">
                <div className="h-full bg-pump-muted/30" style={{ width: `${splitConfig.platformPct}%` }} />
                <div className="h-full bg-pump-green" style={{ width: `${splitConfig.holderPct}%` }} />
                {splitConfig.buybackEnabled && splitConfig.buybackPct > 0 && (
                  <div className="h-full bg-pump-accent" style={{ width: `${splitConfig.buybackPct}%` }} />
                )}
                <div className="h-full bg-pump-cyan" style={{ width: `${splitConfig.lpPct}%` }} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-pump-muted">
                    <span className="h-2 w-2 rounded-full bg-pump-muted/30" /> Platform
                  </span>
                  <span className="font-medium text-white">{splitConfig.platformPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-pump-green">
                    <span className="h-2 w-2 rounded-full bg-pump-green" /> Holders
                  </span>
                  <span className="font-medium text-white">{splitConfig.holderPct.toFixed(1)}%</span>
                </div>
                {splitConfig.buybackEnabled && splitConfig.buybackPct > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-pump-accent">
                      <span className="h-2 w-2 rounded-full bg-pump-accent" /> Buyback
                      <span className="rounded bg-pump-accent/10 px-1 py-0.5 text-[9px] font-bold text-pump-accent uppercase">{splitConfig.buybackAction}</span>
                    </span>
                    <span className="font-medium text-white">{splitConfig.buybackPct.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-pump-cyan">
                    <span className="h-2 w-2 rounded-full bg-pump-cyan" /> LP
                  </span>
                  <span className="font-medium text-white">{splitConfig.lpPct.toFixed(1)}%</span>
                </div>
              </div>

              {/* Pending split change */}
              {splitConfig.pendingSplitBps != null && splitConfig.splitEffectiveAt && (
                <div className="mt-4 rounded-lg border border-pump-accent/15 bg-pump-accent/[0.06] px-3 py-2.5">
                  <p className="text-[11px] font-medium text-pump-accent">Pending split change</p>
                  <p className="mt-1 text-[10px] text-pump-muted">
                    Holders: {(splitConfig.pendingSplitBps / 100).toFixed(0)}% / LP: {((10000 - splitConfig.pendingSplitBps) / 100).toFixed(0)}%
                  </p>
                  <p className="mt-0.5 text-[10px] text-pump-muted">
                    Effective: {new Date(splitConfig.splitEffectiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LP Status */}
          {splitConfig?.graduated && (
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">LP Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pump-muted">Graduation</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-pump-green/10 px-2 py-0.5 text-[11px] font-medium text-pump-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-pump-green" />
                    Graduated
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pump-muted">LP Deployed</span>
                  {splitConfig.lpDeployed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-pump-green/10 px-2 py-0.5 text-[11px] font-medium text-pump-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-pump-green" />
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-pump-muted">Pending</span>
                  )}
                </div>
                {splitConfig.pendingLpSol !== "0" && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-pump-muted">Pending LP SOL</span>
                    <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.pendingLpSol)} SOL</span>
                  </div>
                )}
                {splitConfig.totalPlatformFees !== "0" && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-pump-muted">Platform Fees</span>
                    <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.totalPlatformFees)} SOL</span>
                  </div>
                )}
                {splitConfig.lpPoolKey && (
                  <a
                    href={`https://pump.fun/pool/${splitConfig.lpPoolKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-pump-border bg-pump-dark/50 px-3 py-2 text-[11px] font-medium text-pump-text transition-colors hover:border-pump-border-light hover:text-white"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    View PumpSwap Pool
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Buyback — interactive for creator, read-only for others */}
          {splitConfig && (
            <BuybackCard
              splitConfig={splitConfig}
              isCreator={!!publicKey && publicKey.toBase58() === meta?.creator}
              mint={mint}
              getAccessToken={getAccessToken}
              toast={toast}
              onUpdate={(updated) => setSplitConfig({ ...splitConfig, ...updated })}
            />
          )}

          {recentEpochs.length > 0 && (
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Recent Distributions</h3>
                <Link to={`/vault/${mint}/analytics`} className="text-[10px] text-pump-accent transition-colors hover:text-pump-pink">View all</Link>
              </div>
              <div className="space-y-2">
                {recentEpochs.map((e) => (
                  <div key={e.epoch} className="flex items-center justify-between rounded-lg bg-pump-dark/40 px-3 py-2">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-white">#{e.epoch}</span>
                      <span className="ml-2 text-[10px] text-pump-muted">{formatEpochDate(e.createdAt)}</span>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-pump-green">+{(Number(e.epochAmount) / 1e9).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-pump-muted">Duration Multiplier</h3>
            <div className="space-y-4">
              <MultRow label="1 hour" mult="0.20x" pct={2} />
              <MultRow label="1 day" mult="1.00x" pct={10} />
              <MultRow label="1 week" mult="2.65x" pct={26.5} />
              <MultRow label="1 month" mult="5.48x" pct={54.8} />
              <MultRow label="3 months" mult="9.49x" pct={94.9} />
              <MultRow label="100+ days" mult="10.0x" pct={100} />
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div id="top-earners" className="animate-slide-up stagger-3 md:col-span-2">
          <div className="rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-pump-border/50 px-6 py-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pump-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-accent">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                Top Earners
              </h3>
              <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-pump-muted">
                {dist?.topHolders?.length ?? 0} / {dist?.holderCount ?? 0}
              </span>
            </div>

            <div className="overflow-x-auto p-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton h-12 w-full" />
                  ))}
                </div>
              ) : !dist?.topHolders?.length ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-pump-border/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <p className="text-sm text-pump-muted">No distributions yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  {dist.epochCount > 0 ? (
                    <div className="mb-1 grid min-w-[420px] grid-cols-[40px_1fr_1fr_72px] gap-3 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">
                      <span>#</span>
                      <span>Wallet</span>
                      <span className="text-right">Cumulative</span>
                      <span className="text-right">Score</span>
                    </div>
                  ) : (
                    <div className="mb-1 grid min-w-[360px] grid-cols-[40px_1fr_1fr] gap-3 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">
                      <span>#</span>
                      <span>Wallet</span>
                      <span className="text-right">Token Balance</span>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {(() => {
                      const myWallet = publicKey?.toBase58();
                      const preDistribution = dist.epochCount === 0;
                      const maxScore = Math.max(...dist.topHolders.map((h) => h.score), 1);
                      return dist.topHolders.map((h, i) => {
                        const isMe = myWallet === h.wallet;
                        const rankColor = i === 0 ? "text-pump-gold" : i === 1 ? "text-pump-silver" : i === 2 ? "text-pump-bronze" : "text-pump-muted";
                        return (
                          <div
                            key={h.wallet}
                            className={`grid ${preDistribution ? "min-w-[360px] grid-cols-[40px_1fr_1fr]" : "min-w-[420px] grid-cols-[40px_1fr_1fr_72px]"} items-center gap-3 rounded-lg px-3 py-3 transition-colors ${
                              isMe ? "bg-pump-green/[0.06] ring-1 ring-pump-green/10" : "hover:bg-white/[0.02]"
                            }`}
                          >
                            <span className={`font-mono text-xs font-bold ${rankColor}`}>
                              {i < 3 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04]">
                                  {i + 1}
                                </span>
                              ) : (
                                i + 1
                              )}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-xs text-white">
                              {shortenAddress(h.wallet)}
                              <CopyButton text={h.wallet} label="wallet" />
                              {isMe && <span className="ml-1 rounded bg-pump-green/10 px-1.5 py-0.5 text-[9px] font-bold text-pump-green">YOU</span>}
                            </span>
                            {preDistribution ? (
                              <span className="text-right text-xs text-pump-text">
                                {h.balance ? Number(BigInt(h.balance) / BigInt(1e6)).toLocaleString() : "0"}
                              </span>
                            ) : (
                              <>
                                <span className="text-right text-xs text-pump-text">{lamportsToSol(h.cumulativeAmount)} SOL</span>
                                <span className="text-right font-mono text-xs text-pump-muted">{((h.score / maxScore) * 100).toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuybackCard({
  splitConfig,
  isCreator,
  mint,
  getAccessToken,
  toast,
  onUpdate,
}: {
  splitConfig: SplitConfig;
  isCreator: boolean;
  mint: string;
  getAccessToken: () => Promise<string | null>;
  toast: (type: "success" | "error", message: string) => void;
  onUpdate: (partial: Partial<SplitConfig>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bbEnabled, setBbEnabled] = useState(splitConfig.buybackEnabled);
  const [bbBps, setBbBps] = useState(splitConfig.buybackSplitBps || 1000);
  const [bbAction, setBbAction] = useState(splitConfig.buybackAction || "hold");
  const [thresholdInput, setThresholdInput] = useState("0.1");

  // Sync state when splitConfig changes
  useEffect(() => {
    setBbEnabled(splitConfig.buybackEnabled);
    setBbBps(splitConfig.buybackSplitBps || 1000);
    setBbAction(splitConfig.buybackAction || "hold");
  }, [splitConfig.buybackEnabled, splitConfig.buybackSplitBps, splitConfig.buybackAction]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const thresholdLamports = Math.max(Math.round(parseFloat(thresholdInput) * 1e9), 100_000_000);

      const res = await authApiFetch(`/api/vault/${mint}/configure-buyback`, token, {
        method: "POST",
        body: JSON.stringify({
          enabled: bbEnabled,
          buybackSplitBps: bbEnabled ? bbBps : 0,
          buybackAction: bbAction,
          buybackThresholdSol: String(thresholdLamports),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to configure buyback");
      }

      // Recompute display percentages
      const platformPct = splitConfig.platformFeeBps / 100;
      const afterPlatform = 100 - platformPct;
      const effectiveBps = bbEnabled ? bbBps : 0;
      const buybackPct = (effectiveBps / 10000) * afterPlatform;
      const holderPct = (splitConfig.holderSplitBps / 10000) * afterPlatform;
      const lpPct = afterPlatform - holderPct - buybackPct;

      onUpdate({
        buybackEnabled: bbEnabled,
        buybackSplitBps: bbEnabled ? bbBps : 0,
        buybackAction: bbAction,
        buybackPct,
        holderPct,
        lpPct,
      });

      toast("success", bbEnabled ? "Buyback enabled" : "Buyback disabled");
      setEditing(false);
    } catch (err: unknown) {
      toast("error", sanitizeError(err instanceof Error ? err.message : "Failed"));
    } finally {
      setSaving(false);
    }
  };

  // Non-creator: only show if buyback is active
  if (!isCreator && !splitConfig.buybackEnabled) return null;

  // Read-only view for non-creators
  if (!isCreator) {
    return (
      <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
        <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">Buyback</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-pump-muted">Action</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-pump-accent/10 px-2 py-0.5 text-[11px] font-medium text-pump-accent capitalize">{splitConfig.buybackAction}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-pump-muted">Split</span>
            <span className="font-mono font-medium text-white">{splitConfig.buybackPct.toFixed(1)}%</span>
          </div>
          {splitConfig.pendingBuybackSol !== "0" && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-pump-muted">Pending SOL</span>
              <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.pendingBuybackSol)} SOL</span>
            </div>
          )}
          {splitConfig.totalBuybackSol !== "0" && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-pump-muted">Total Spent</span>
              <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.totalBuybackSol)} SOL</span>
            </div>
          )}
          {splitConfig.buybackAction === "hold" && splitConfig.buybackTokenBalance !== "0" && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-pump-muted">Tokens Held</span>
              <span className="font-mono font-medium text-white">{Number(BigInt(splitConfig.buybackTokenBalance) / BigInt(1e6)).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Creator: interactive card
  const maxBuybackBps = 10000 - splitConfig.holderSplitBps;
  const afterPlatform = 100 - splitConfig.platformFeeBps / 100;
  const previewBuybackPct = bbEnabled ? (bbBps / 10000) * afterPlatform : 0;
  const previewLpPct = afterPlatform - (splitConfig.holderSplitBps / 10000) * afterPlatform - previewBuybackPct;

  return (
    <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Buyback</h3>
        {/* Toggle */}
        <button
          type="button"
          onClick={() => { setBbEnabled(!bbEnabled); setEditing(true); }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            bbEnabled ? "bg-pump-accent" : "bg-pump-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              bbEnabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {bbEnabled && (
        <div className="space-y-4">
          {/* Split slider */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-pump-muted">Buyback Split</span>
              <span className="font-mono text-[11px] font-medium text-white">{(bbBps / 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={100}
              max={maxBuybackBps}
              step={100}
              value={bbBps}
              onChange={(e) => { setBbBps(parseInt(e.target.value, 10)); setEditing(true); }}
              className="w-full accent-pump-accent"
            />
            <div className="mt-1 flex justify-between text-[9px] text-pump-muted">
              <span>1%</span>
              <span>LP: {previewLpPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Action selector */}
          <div>
            <span className="mb-2 block text-[11px] text-pump-muted">Action</span>
            <div className="flex gap-2">
              {(["hold", "burn"] as const).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => { setBbAction(action); setEditing(true); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-medium capitalize transition-colors ${
                    bbAction === action
                      ? "bg-pump-accent/15 text-pump-accent ring-1 ring-pump-accent/30"
                      : "bg-pump-dark/50 text-pump-muted hover:text-white"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div>
            <span className="mb-2 block text-[11px] text-pump-muted">Threshold (min 0.1 SOL)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={thresholdInput}
                onChange={(e) => { setThresholdInput(e.target.value); setEditing(true); }}
                className="w-full rounded-lg border border-pump-border bg-pump-dark/50 px-3 py-2 font-mono text-xs text-white outline-none focus:border-pump-accent/50"
              />
              <span className="text-[11px] text-pump-muted">SOL</span>
            </div>
          </div>

          {/* Stats (when active) */}
          {splitConfig.buybackEnabled && (
            <div className="space-y-2 border-t border-pump-border/50 pt-3">
              {splitConfig.pendingBuybackSol !== "0" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pump-muted">Pending</span>
                  <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.pendingBuybackSol)} SOL</span>
                </div>
              )}
              {splitConfig.totalBuybackSol !== "0" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pump-muted">Total Spent</span>
                  <span className="font-mono font-medium text-white">{lamportsToSol(splitConfig.totalBuybackSol)} SOL</span>
                </div>
              )}
              {splitConfig.buybackAction === "hold" && splitConfig.buybackTokenBalance !== "0" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pump-muted">Tokens Held</span>
                  <span className="font-mono font-medium text-white">{Number(BigInt(splitConfig.buybackTokenBalance) / BigInt(1e6)).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          {editing && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-pump-accent px-4 py-2.5 text-xs font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Buyback Config"}
            </button>
          )}
        </div>
      )}

      {/* Disabled state — just show toggle */}
      {!bbEnabled && editing && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full rounded-xl bg-pump-accent px-4 py-2.5 text-xs font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving..." : "Disable Buyback"}
        </button>
      )}

      {!bbEnabled && !editing && (
        <p className="text-[11px] text-pump-muted">
          Enable buyback to auto-purchase tokens with a portion of fees.
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: string; color?: string; icon: React.ReactNode }) {
  const colorCls = color === "green" ? "text-pump-green" : color === "cyan" ? "text-pump-cyan" : "text-white";
  return (
    <div className="rounded-xl border border-pump-border/50 bg-pump-dark/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-pump-muted/50">{icon}</span>
        <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">{label}</p>
      </div>
      <p className={`font-mono text-lg font-bold ${colorCls}`}>{value}</p>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-pump-muted">{label}</span>
      <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white">{value}</span>
    </div>
  );
}

function formatEpochDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const flowColors = {
  green: { ring: "ring-pump-green/20", bg: "bg-pump-green/10", text: "text-pump-green", glow: "shadow-[0_0_12px_rgba(0,255,136,0.15)]" },
  cyan: { ring: "ring-pump-cyan/20", bg: "bg-pump-cyan/10", text: "text-pump-cyan", glow: "shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  accent: { ring: "ring-pump-accent/20", bg: "bg-pump-accent/10", text: "text-pump-accent", glow: "shadow-[0_0_12px_rgba(124,58,237,0.15)]" },
} as const;

function FlowNode({ icon, label, sublabel, address, color }: {
  icon: React.ReactNode; label: string; sublabel: string; address: string; color: keyof typeof flowColors;
}) {
  const c = flowColors[color];
  return (
    <div className={`group relative w-full rounded-xl border border-pump-border/60 bg-pump-dark/60 p-3.5 ring-1 ${c.ring} transition-all hover:${c.glow} hover:border-pump-border-light`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">{label}</span>
            <span className="text-[10px] text-pump-muted">{sublabel}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono text-[11px] text-pump-muted transition-colors hover:${c.text}`}
              title={address}
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </a>
            <CopyButton text={address} label={label} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowEndNode({ holderCount, isPushMode }: { holderCount: number; isPushMode: boolean }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById("top-earners")?.scrollIntoView({ behavior: "smooth" })}
      className="group relative w-full rounded-xl border border-pump-border/60 bg-pump-dark/60 p-3.5 ring-1 ring-pump-pink/20 transition-all hover:border-pump-border-light text-left cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pump-pink/10 text-pump-pink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">Top Earners</span>
            <span className="text-[10px] text-pump-muted">{isPushMode ? "Receive SOL" : "Claim SOL"}</span>
          </div>
          <span className="mt-0.5 font-mono text-[11px] text-pump-muted group-hover:text-pump-pink transition-colors">
            {holderCount} eligible · view leaderboard ↓
          </span>
        </div>
      </div>
    </button>
  );
}

function FlowConnector() {
  return (
    <div className="relative flex h-8 w-full items-center justify-center">
      <div className="h-full w-px bg-gradient-to-b from-pump-border-light to-pump-border" />
      {/* Animated particle */}
      <div className="absolute inset-0 flex justify-center overflow-hidden">
        <div
          className="h-2 w-px bg-pump-green/60"
          style={{ animation: "flow-down 2s ease-in-out infinite" }}
        />
      </div>
      {/* Arrow */}
      <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-0 text-pump-border-light" fill="currentColor">
        <path d="M4 8L0 4h8z" />
      </svg>
    </div>
  );
}

function formatExpiryHours(hours: number | null | undefined): string {
  const h = hours ?? 168; // default 7 days
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  return `${days}d`;
}

function formatExpiryCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "soon";
  const hours = Math.floor(diff / 3600_000);
  if (hours < 1) return "in less than 1 hour";
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

function MultRow({ label, mult, pct }: { label: string; mult: string; pct: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-pump-muted">{label}</span>
        <span className="font-mono text-[11px] font-medium text-pump-green">{mult}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-pump-border/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pump-green/40 to-pump-green transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
