import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { LoginButton } from "../components/LoginButton";
import {
  fetchUserClaims,
  fetchCreatedVaults,
  type UserClaim,
  type CreatedVault,
} from "../lib/anvilProgram.ts";
import { lamportsToSol, shortenAddress } from "../lib/format.ts";
import { custodialClaimSignAndSubmit, custodialCloseVaultSignAndSubmit, authApiFetch, sanitizeError } from "../lib/api.ts";
import { useToast } from "../components/Toast.tsx";

const CLOSE_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ready";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  const secs = Math.floor((ms % (60 * 1000)) / 1000);
  return `${mins}m ${secs}s`;
}

export function Profile() {
  const { publicKey, connected, getAccessToken } = useAnvilWallet();
  const [claims, setClaims] = useState<UserClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingMint, setClaimingMint] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{ mint: string; sig: string } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const { toast } = useToast();

  // Created vaults + close vault state
  const [createdVaults, setCreatedVaults] = useState<CreatedVault[]>([]);
  const [requestingCloseMint, setRequestingCloseMint] = useState<string | null>(null);
  const [cancellingCloseMint, setCancellingCloseMint] = useState<string | null>(null);
  const [closingMint, setClosingMint] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!publicKey) { setClaims([]); setCreatedVaults([]); return; }
    setLoading(true);
    Promise.all([
      fetchUserClaims(publicKey.toBase58()).then((data) => setClaims(data.claims)).catch(() => setClaims([])),
      fetchCreatedVaults(publicKey.toBase58()).then((data) => setCreatedVaults(data.vaults)).catch(() => setCreatedVaults([])),
    ]).finally(() => setLoading(false));
  }, [publicKey]);

  // Countdown timer for closing vaults
  useEffect(() => {
    const closing = createdVaults.filter((v) => v.closeRequestedAt);
    if (closing.length === 0) { setCountdowns({}); return; }
    const tick = () => {
      const now = Date.now();
      const next: Record<string, number> = {};
      for (const v of closing) {
        const deadline = new Date(v.closeRequestedAt!).getTime() + CLOSE_GRACE_PERIOD_MS;
        next[v.tokenMint] = Math.max(0, deadline - now);
      }
      setCountdowns(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdVaults]);

  const totalClaimable = useMemo(() => claims.reduce((sum, c) => sum + Number(c.claimable), 0), [claims]);
  const totalEarned = useMemo(() => claims.reduce((sum, c) => sum + Number(c.cumulativeAmount), 0), [claims]);
  const totalClaimed = useMemo(() => claims.reduce((sum, c) => sum + Number(c.alreadyClaimed), 0), [claims]);

  const handleClaim = async (userClaim: UserClaim) => {
    if (!publicKey || claimingMint) return;
    setClaimingMint(userClaim.mint);
    setClaimError(null);
    setClaimResult(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { signature } = await custodialClaimSignAndSubmit(token, userClaim.mint);
      setClaimResult({ mint: userClaim.mint, sig: signature });
      toast("success", `Claimed from ${userClaim.mint.slice(0, 8)}...`, { label: "View TX", href: `https://solscan.io/tx/${signature}` });
      const updated = await fetchUserClaims(publicKey.toBase58());
      setClaims(updated.claims);
    } catch (err: unknown) {
      const msg = sanitizeError(err instanceof Error ? err.message : "Failed to claim");
      setClaimError(msg);
      toast("error", msg);
    } finally {
      setClaimingMint(null);
    }
  };

  // Request close (starts 72h grace period) — uses JWT auth
  const handleRequestClose = async (vault: CreatedVault) => {
    if (!publicKey) return;
    setRequestingCloseMint(vault.tokenMint);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await authApiFetch(`/api/vault/${vault.tokenMint}/request-close`, token, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to request close");
      }
      toast("success", "Close requested. 72-hour grace period started.");
      const updated = await fetchCreatedVaults(publicKey.toBase58());
      setCreatedVaults(updated.vaults);
    } catch (err: unknown) {
      toast("error", sanitizeError(err instanceof Error ? err.message : "Failed to request close"));
    } finally {
      setRequestingCloseMint(null);
    }
  };

  // Cancel close request — uses JWT auth
  const handleCancelClose = async (vault: CreatedVault) => {
    if (!publicKey) return;
    setCancellingCloseMint(vault.tokenMint);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await authApiFetch(`/api/vault/${vault.tokenMint}/cancel-close`, token, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel close");
      }
      toast("success", "Close request cancelled.");
      const updated = await fetchCreatedVaults(publicKey.toBase58());
      setCreatedVaults(updated.vaults);
    } catch (err: unknown) {
      toast("error", sanitizeError(err instanceof Error ? err.message : "Failed to cancel close"));
    } finally {
      setCancellingCloseMint(null);
    }
  };

  // Finalize close (after 72h) — backend builds + signs + submits close_vault TX
  const handleFinalizeClose = async (vault: CreatedVault) => {
    if (!publicKey || closingMint) return;
    setClosingMint(vault.tokenMint);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { signature } = await custodialCloseVaultSignAndSubmit(token, vault.tokenMint);
      toast("success", "Vault closed", { label: "View TX", href: `https://solscan.io/tx/${signature}` });
      const updated = await fetchCreatedVaults(publicKey.toBase58());
      setCreatedVaults(updated.vaults);
    } catch (err: unknown) {
      toast("error", sanitizeError(err instanceof Error ? err.message : "Close vault failed"));
    } finally {
      setClosingMint(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
      <div className="animate-slide-up mb-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pump-accent/10 text-pump-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>
        <p className="text-sm text-pump-muted">
          View and claim your earned SOL across all vaults.
        </p>
      </div>

      {!connected ? (
        <div className="animate-scale-in mx-auto max-w-lg rounded-2xl border border-pump-border bg-pump-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pump-accent/10 text-pump-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="mb-2 font-semibold text-white">Connect your wallet</p>
          <p className="mb-6 text-sm text-pump-muted">Connect to see your claimable rewards.</p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-pump-border bg-pump-card p-6">
                <div className="skeleton mb-3 h-3 w-20" />
                <div className="skeleton h-7 w-28" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-2xl" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Wallet address */}
          {publicKey && (
            <div className="animate-slide-up stagger-1 mb-6 flex items-center gap-3 rounded-xl border border-pump-border bg-pump-card/50 px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pump-accent/30 to-pump-green/20" />
              <div>
                <p className="text-[10px] text-pump-muted">Connected wallet</p>
                <p className="font-mono text-xs text-white">{shortenAddress(publicKey.toBase58(), 8, 6)}</p>
              </div>
            </div>
          )}

          {/* Aggregate stats */}
          <div className="animate-slide-up stagger-2 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted/50">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Total Earned</p>
              </div>
              <p className="font-mono text-xl font-bold text-white">{(totalEarned / 1e9).toFixed(4)} SOL</p>
            </div>
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-accent/50">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Total Claimed</p>
              </div>
              <p className="font-mono text-xl font-bold text-pump-accent">{(totalClaimed / 1e9).toFixed(4)} SOL</p>
            </div>
            <div className="rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
              {totalClaimable > 0 && <div className="h-px bg-gradient-to-r from-transparent via-pump-green/30 to-transparent" />}
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green/50">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Total Claimable</p>
                </div>
                <p className="font-mono text-xl font-bold text-pump-green">{(totalClaimable / 1e9).toFixed(4)} SOL</p>
              </div>
            </div>
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted/50">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                <p className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Active Vaults</p>
              </div>
              <p className="font-mono text-xl font-bold text-white">{claims.length}</p>
            </div>
          </div>

          {/* Claims list */}
          <div className="animate-slide-up stagger-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Your Vaults</h2>
              <span className="text-[10px] text-pump-muted">{claims.length} {claims.length === 1 ? "vault" : "vaults"}</span>
            </div>

            {claims.length === 0 ? (
              <div className="rounded-2xl border border-pump-border bg-pump-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pump-border/30">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  </svg>
                </div>
                <p className="mb-2 text-sm font-medium text-white">No claimable rewards found</p>
                <p className="mb-6 text-xs text-pump-muted">Hold tokens in Anvil Protocol vaults to start earning.</p>
                <Link to="/explore" className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08]">
                  Browse Vaults
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((c) => {
                  const claimSol = lamportsToSol(c.claimable);
                  const hasClaim = c.claimable !== "0";
                  return (
                    <div
                      key={c.mint}
                      className={`card-interactive rounded-2xl border bg-pump-card overflow-hidden ${
                        hasClaim ? "border-pump-green/10" : "border-pump-border"
                      }`}
                    >
                      {hasClaim && <div className="h-px bg-gradient-to-r from-transparent via-pump-green/20 to-transparent" />}
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pump-green/10 to-pump-accent/10 text-sm font-bold text-white ring-1 ring-white/5">
                            {c.mint[0].toUpperCase()}
                          </div>
                          <div>
                            <Link
                              to={`/vault/${c.mint}`}
                              className="mb-0.5 block font-mono text-sm font-medium text-white transition-colors hover:text-pump-green"
                            >
                              {shortenAddress(c.mint, 8, 6)}
                            </Link>
                            <p className="text-[11px] text-pump-muted">
                              Earned: <span className="text-pump-text">{lamportsToSol(c.cumulativeAmount)} SOL</span>
                              <span className="mx-1.5 text-pump-border-light">|</span>
                              Claimed: <span className="text-pump-text">{lamportsToSol(c.alreadyClaimed)} SOL</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaim(c)}
                          disabled={claimingMint === c.mint || !hasClaim}
                          className={`btn-glow shrink-0 rounded-xl px-6 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            hasClaim
                              ? "bg-pump-green text-pump-dark hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]"
                              : "bg-pump-border text-pump-muted"
                          }`}
                        >
                          {claimingMint === c.mint ? (
                            <span className="inline-flex items-center gap-2">
                              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                              Claiming...
                            </span>
                          ) : hasClaim ? `Claim ${claimSol} SOL` : "Fully claimed"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Created Vaults — Close Vault */}
          {createdVaults.length > 0 && (
            <div className="animate-slide-up stagger-4 mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-pump-muted">My Created Vaults</h2>
                <span className="text-[10px] text-pump-muted">{createdVaults.length} {createdVaults.length === 1 ? "vault" : "vaults"}</span>
              </div>

              <div className="space-y-3">
                {createdVaults.map((v) => {
                  const isClosing = !!v.closeRequestedAt;
                  const remaining = countdowns[v.tokenMint] ?? 0;
                  const graceExpired = isClosing && remaining === 0;

                  return (
                    <div
                      key={v.tokenMint}
                      className={`rounded-2xl border overflow-hidden ${
                        !v.active ? "border-pump-border/50 bg-pump-card/50"
                        : isClosing ? "border-amber-500/15 bg-pump-card"
                        : "border-pump-border bg-pump-card"
                      }`}
                    >
                      {isClosing && v.active && <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />}
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          {v.imageUrl ? (
                            <img src={v.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/5" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pump-accent/10 to-pump-pink/10 text-sm font-bold text-white ring-1 ring-white/5">
                              {(v.symbol || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/vault/${v.tokenMint}`}
                              className="mb-0.5 block text-sm font-medium text-white transition-colors hover:text-pump-green"
                            >
                              {v.name || "Unknown"} <span className="text-pump-muted">${v.symbol || "???"}</span>
                            </Link>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-pump-muted">
                                Split: <span className="text-pump-text">{v.holderSplitBps / 100}% holders</span>
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                !v.active ? "bg-red-500/10 text-red-400"
                                : isClosing ? "bg-amber-500/10 text-amber-400"
                                : "bg-pump-green/10 text-pump-green"
                              }`}>
                                {!v.active ? "Closed" : isClosing ? "Closing" : "Active"}
                              </span>
                              {isClosing && v.active && !graceExpired && (
                                <span className="font-mono text-[10px] text-amber-400">
                                  {formatCountdown(remaining)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {/* State 1: Active, no close requested */}
                          {v.active && !isClosing && (
                            <button
                              onClick={() => handleRequestClose(v)}
                              disabled={requestingCloseMint === v.tokenMint}
                              className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-2.5 text-sm font-bold text-amber-400 transition-all hover:bg-amber-500/10 hover:border-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {requestingCloseMint === v.tokenMint ? (
                                <span className="inline-flex items-center gap-2">
                                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                                  Requesting...
                                </span>
                              ) : "Request Close"}
                            </button>
                          )}

                          {/* State 2: Closing, grace period active */}
                          {v.active && isClosing && !graceExpired && (
                            <button
                              onClick={() => handleCancelClose(v)}
                              disabled={cancellingCloseMint === v.tokenMint}
                              className="rounded-xl border border-pump-border bg-white/5 px-5 py-2.5 text-sm font-bold text-pump-text transition-all hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {cancellingCloseMint === v.tokenMint ? (
                                <span className="inline-flex items-center gap-2">
                                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                                  Cancelling...
                                </span>
                              ) : "Cancel Close"}
                            </button>
                          )}

                          {/* State 3: Grace period expired */}
                          {v.active && isClosing && graceExpired && (
                            <button
                              onClick={() => handleFinalizeClose(v)}
                              disabled={closingMint === v.tokenMint}
                              className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-2.5 text-sm font-bold text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {closingMint === v.tokenMint ? (
                                <span className="inline-flex items-center gap-2">
                                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                                  Closing...
                                </span>
                              ) : "Finalize Close"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {claimError && (
            <div className="animate-scale-in mt-6 rounded-lg border border-red-500/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
              {claimError}
            </div>
          )}
          {claimResult && (
            <div className="animate-scale-in mt-6 rounded-lg border border-pump-green/15 bg-pump-green/[0.06] px-4 py-3 text-sm text-pump-green">
              Claimed from {claimResult.mint.slice(0, 8)}...!{" "}
              <a href={`https://solscan.io/tx/${claimResult.sig}`} target="_blank" rel="noopener noreferrer" className="underline">View TX</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
