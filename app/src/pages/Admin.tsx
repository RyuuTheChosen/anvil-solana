import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { useConnectWallet } from "@privy-io/react-auth";
import { useConnection } from "../contexts/SolanaConnection";
import { PublicKey, Transaction } from "@solana/web3.js";
import { apiFetch } from "../lib/api";
import { createAdminFetcher, clearAdminAuth } from "../lib/adminFetch";
import { shortenAddress, lamportsToSol } from "../lib/format";
import { isValidBase58 } from "../lib/validate";
import { isUserRejection } from "../lib/walletErrors";
import {
  fetchPlatformConfig,
  buildWithdrawTreasuryIx,
  buildUpdatePlatformIx,
  submitAdminTransaction,
  deriveTreasuryPda,
  type PlatformConfigData,
} from "../lib/adminProgram";

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  holderCount: number;
  totalDistributed: string;
  epochCount: number;
  lastDistributionAt: string | null;
}

interface ActionResult {
  type: "success" | "error";
  message: string;
}

interface CrankerHealth {
  status: string;
  timestamp: string;
}

interface VaultHealth {
  id: number;
  mint: string;
  name: string;
  symbol: string;
  active: boolean;
  vaultCreated: boolean;
  feeSharingConfirmed: boolean;
  consecutiveFailures: number;
  lastErrorType: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
}

interface HealthSummary {
  total: number;
  active: number;
  paused: number;
  erroring: number;
}

interface LpSummary {
  totalVaults: number;
  graduatedVaults: number;
  lpDeployedVaults: number;
  totalPendingLpSol: string;
  totalLpSolDeposited: string;
  totalPlatformFees: string;
  vaults: Array<{
    mint: string;
    name: string;
    symbol: string;
    graduated: boolean;
    lpDeployed: boolean;
    pendingLpSol: string;
    lpSolDeposited: string;
    lpPoolKey: string | null;
    totalPlatformFees: string;
  }>;
}

export function Admin() {
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { connection } = useConnection();

  // Admin wallet: first connected external Solana wallet
  const adminWallet = wallets[0];
  const publicKey = useMemo(
    () => adminWallet ? new PublicKey(adminWallet.address) : null,
    [adminWallet]
  );
  const signMessage = useMemo(
    () => adminWallet ? async (msg: Uint8Array): Promise<Uint8Array> => {
      const result = await adminWallet.signMessage({ message: msg });
      return result.signature;
    } : undefined,
    [adminWallet]
  );
  const signTransaction = useMemo(
    () => adminWallet ? async (tx: Transaction): Promise<Transaction> => {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const result = await adminWallet.signTransaction({ transaction: serialized });
      return Transaction.from(result.signedTransaction);
    } : undefined,
    [adminWallet]
  );

  const adminFetch = useMemo(
    () => createAdminFetcher(signMessage, publicKey),
    [signMessage, publicKey]
  );

  const [config, setConfig] = useState<PlatformConfigData | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [crankerHealth, setCrankerHealth] = useState<CrankerHealth | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [vaultHealth, setVaultHealth] = useState<VaultHealth[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [vaultActionPending, setVaultActionPending] = useState<string | null>(null);
  const [lpSummary, setLpSummary] = useState<LpSummary | null>(null);

  // Form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");
  const [newFeeBps, setNewFeeBps] = useState("");

  const showResult = useCallback((result: ActionResult) => {
    setActionResult(result);
    setTimeout(() => setActionResult(null), 5000);
  }, []);

  // Load on-chain data
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;

    async function load() {
      try {
        const [cfg, balance] = await Promise.all([
          fetchPlatformConfig(connection),
          connection.getBalance(deriveTreasuryPda()[0]),
        ]);
        if (cancelled) return;
        setConfig(cfg);
        setTreasuryBalance(balance);
      } catch (err) {
        if (import.meta.env.DEV) console.error("[admin] Failed to load platform config:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [publicKey, connection]);

  // Load cranker health + tokens
  useEffect(() => {
    if (!publicKey || !config) return;
    if (publicKey.toBase58() !== config.authority) return;

    adminFetch("/api/explore/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setCrankerHealth(data); })
      .catch(() => {});

    apiFetch("/api/explore/tokens")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.tokens) setTokens(data.tokens); })
      .catch(() => {});

    adminFetch("/api/explore/lp-summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setLpSummary(data); })
      .catch(() => {});

    loadVaultHealth();
  }, [publicKey, config, adminFetch]);

  function loadVaultHealth() {
    adminFetch("/api/explore/vault-health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setVaultHealth(data.vaults);
          setHealthSummary(data.summary);
        }
      })
      .catch(() => {});
  }

  async function handleVaultAction(mint: string, action: "pause" | "reactivate") {
    if (vaultActionPending) return;
    setVaultActionPending(mint);
    try {
      const res = await adminFetch(`/api/explore/vault-health/${mint}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showResult({ type: "success", message: `Vault ${mint.slice(0, 8)}... ${action === "pause" ? "paused" : "reactivated"}` });
        loadVaultHealth();
      } else {
        showResult({ type: "error", message: data.error || `${action} failed` });
      }
    } catch {
      showResult({ type: "error", message: "Network error" });
    } finally {
      setVaultActionPending(null);
    }
  }

  async function handleVaultVerify(mint: string) {
    if (vaultActionPending) return;
    setVaultActionPending(mint);
    try {
      const res = await adminFetch(`/api/explore/vault-health/${mint}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = data.updated as string[];
        if (updated.length > 0) {
          showResult({ type: "success", message: `Verified ${mint.slice(0, 8)}... — updated: ${updated.join(", ")}` });
        } else {
          showResult({ type: "success", message: `${mint.slice(0, 8)}... verified — no changes needed (vault: ${data.vaultOnChain ? "yes" : "no"}, feeSharing: ${data.feeSharingOnChain ? "yes" : "no"})` });
        }
        loadVaultHealth();
      } else {
        showResult({ type: "error", message: data.error || "Verify failed" });
      }
    } catch {
      showResult({ type: "error", message: "Network error" });
    } finally {
      setVaultActionPending(null);
    }
  }

  // Auth gate: admin only needs an external wallet, not X login
  if (!adminWallet || !publicKey) {
    clearAdminAuth();
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="rounded-2xl border border-pump-border bg-pump-card p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-pump-border bg-pump-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="mb-2 text-base font-medium text-white">Connect an admin wallet</p>
          <p className="mb-6 text-sm text-pump-muted">Connect an external Solana wallet (Phantom, Solflare, etc.) to access admin functions.</p>
          <button
            onClick={() => connectWallet()}
            className="rounded-xl bg-pump-accent px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
          >
            Connect Admin Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-pump-green border-t-transparent" />
        <p className="text-sm text-pump-muted">Loading platform config...</p>
      </div>
    );
  }

  if (!config) {
    return <AuthGate message="Platform not initialized. PlatformConfig account not found on-chain." />;
  }

  if (publicKey.toBase58() !== config.authority) {
    return (
      <AuthGate
        message={`Unauthorized. Connected wallet does not match platform authority.`}
        detail={`Authority: ${shortenAddress(config.authority, 6, 6)}`}
      />
    );
  }

  // Admin actions
  async function handleWithdraw() {
    if (!publicKey || !signTransaction || actionPending) return;
    if (!withdrawDest || !isValidBase58(withdrawDest)) {
      showResult({ type: "error", message: "Invalid destination address" });
      return;
    }
    const solAmount = parseFloat(withdrawAmount);
    if (!solAmount || solAmount <= 0) {
      showResult({ type: "error", message: "Amount must be greater than 0" });
      return;
    }
    const lamports = BigInt(Math.round(solAmount * 1e9));
    if (lamports > BigInt(treasuryBalance)) {
      showResult({ type: "error", message: "Amount exceeds treasury balance" });
      return;
    }

    setActionPending(true);
    try {
      const ix = buildWithdrawTreasuryIx(
        publicKey,
        new PublicKey(withdrawDest),
        lamports
      );
      const sig = await submitAdminTransaction(connection, publicKey, signTransaction, ix);
      showResult({ type: "success", message: `Withdrawn! TX: ${sig.slice(0, 12)}...` });
      setWithdrawAmount("");
      setWithdrawDest("");
      // Refresh balance
      const newBal = await connection.getBalance(deriveTreasuryPda()[0]);
      setTreasuryBalance(newBal);
    } catch (err: any) {
      if (isUserRejection(err)) return;
      showResult({ type: "error", message: err?.message || "Transaction failed" });
    } finally {
      setActionPending(false);
    }
  }

  async function handleUpdateFee() {
    if (!publicKey || !signTransaction || actionPending) return;
    const bps = parseInt(newFeeBps);
    if (isNaN(bps) || bps < 0 || bps > 2000) {
      showResult({ type: "error", message: "Fee BPS must be an integer 0-2000" });
      return;
    }

    setActionPending(true);
    try {
      const ix = buildUpdatePlatformIx(publicKey, { platformFeeBps: bps });
      const sig = await submitAdminTransaction(connection, publicKey, signTransaction, ix);
      showResult({ type: "success", message: `Fee updated! TX: ${sig.slice(0, 12)}...` });
      setNewFeeBps("");
      setConfig((prev) => prev ? { ...prev, platformFeeBps: bps } : prev);
    } catch (err: any) {
      if (isUserRejection(err)) return;
      showResult({ type: "error", message: err?.message || "Transaction failed" });
    } finally {
      setActionPending(false);
    }
  }

  async function handleTogglePause() {
    if (!publicKey || !signTransaction || !config || actionPending) return;
    const newPaused = !config.paused;

    setActionPending(true);
    try {
      const ix = buildUpdatePlatformIx(publicKey, { paused: newPaused });
      const sig = await submitAdminTransaction(connection, publicKey, signTransaction, ix);
      showResult({ type: "success", message: `Platform ${newPaused ? "paused" : "unpaused"}! TX: ${sig.slice(0, 12)}...` });
      setConfig((prev) => prev ? { ...prev, paused: newPaused } : prev);
    } catch (err: any) {
      if (isUserRejection(err)) return;
      showResult({ type: "error", message: err?.message || "Transaction failed" });
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pump-accent/10 text-pump-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-pump-muted">Platform administration and monitoring.</p>
      </div>

      {/* Action result banner */}
      {actionResult && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          actionResult.type === "success"
            ? "border-pump-green/20 bg-pump-green/5 text-pump-green"
            : "border-red-500/20 bg-red-500/5 text-red-400"
        }`}>
          {actionResult.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config Card */}
        <Card title="Platform Config">
          <ConfigRow label="Authority" value={shortenAddress(config.authority, 6, 6)} />
          <ConfigRow label="Cranker 1" value={shortenAddress(config.crankerAuthority, 6, 6)} />
          <ConfigRow label="Cranker 2" value={shortenAddress(config.crankerAuthority2, 6, 6)} />
          <ConfigRow label="Treasury PDA" value={shortenAddress(config.platformTreasury, 6, 6)} />
          <ConfigRow label="Platform Fee" value={`${(config.platformFeeBps / 100).toFixed(2)}% (${config.platformFeeBps} bps)`} />
          <ConfigRow label="Vault Count" value={String(config.vaultCount)} />
          <ConfigRow
            label="Status"
            value={config.paused ? "PAUSED" : "Active"}
            valueClass={config.paused ? "text-red-400" : "text-pump-green"}
          />
        </Card>

        {/* Treasury Card */}
        <Card title="Treasury">
          <div className="mb-4">
            <p className="text-xs text-pump-muted">Balance</p>
            <p className="font-mono text-xl font-bold text-white">
              {lamportsToSol(String(treasuryBalance))} <span className="text-sm text-pump-muted">SOL</span>
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="Amount (SOL)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full rounded-lg border border-pump-border bg-pump-dark px-3 py-2 text-sm text-white placeholder:text-pump-muted/50 focus:border-pump-green/30 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Destination wallet address"
              value={withdrawDest}
              onChange={(e) => setWithdrawDest(e.target.value)}
              className="w-full rounded-lg border border-pump-border bg-pump-dark px-3 py-2 text-sm text-white placeholder:text-pump-muted/50 focus:border-pump-green/30 focus:outline-none"
            />
            <button
              onClick={handleWithdraw}
              disabled={actionPending || treasuryBalance === 0}
              className="w-full rounded-lg bg-pump-green px-4 py-2 text-sm font-bold text-pump-dark transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionPending ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </Card>

        {/* Actions Card */}
        <Card title="Platform Actions">
          <div className="space-y-5">
            {/* Fee BPS */}
            <div>
              <label className="mb-2 block text-xs text-pump-muted">
                Update Platform Fee (current: {config.platformFeeBps} bps = {(config.platformFeeBps / 100).toFixed(2)}%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="2000"
                  step="1"
                  placeholder="BPS (0-2000)"
                  value={newFeeBps}
                  onChange={(e) => setNewFeeBps(e.target.value)}
                  className="flex-1 rounded-lg border border-pump-border bg-pump-dark px-3 py-2 text-sm text-white placeholder:text-pump-muted/50 focus:border-pump-green/30 focus:outline-none"
                />
                <button
                  onClick={handleUpdateFee}
                  disabled={actionPending}
                  className="rounded-lg bg-pump-accent px-4 py-2 text-sm font-bold text-white transition-all hover:bg-pump-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Update
                </button>
              </div>
              {newFeeBps && !isNaN(parseInt(newFeeBps)) && (
                <p className="mt-1 text-[11px] text-pump-muted">
                  = {(parseInt(newFeeBps) / 100).toFixed(2)}%
                </p>
              )}
            </div>

            {/* Pause / Unpause */}
            <div>
              <label className="mb-2 block text-xs text-pump-muted">
                Platform is currently {config.paused ? "PAUSED" : "ACTIVE"}
              </label>
              <button
                onClick={handleTogglePause}
                disabled={actionPending}
                className={`w-full rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  config.paused
                    ? "bg-pump-green text-pump-dark hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]"
                    : "bg-red-500/80 text-white hover:bg-red-500"
                }`}
              >
                {actionPending ? "Processing..." : config.paused ? "Unpause Platform" : "Pause Platform"}
              </button>
            </div>
          </div>
        </Card>

        {/* Health Card */}
        <Card title="Cranker Health">
          {crankerHealth ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  crankerHealth.status === "ok" ? "bg-pump-green animate-pulse" : "bg-red-400"
                }`} />
                <span className={`text-sm font-medium ${
                  crankerHealth.status === "ok" ? "text-pump-green" : "text-red-400"
                }`}>
                  {crankerHealth.status === "ok" ? "Healthy" : crankerHealth.status}
                </span>
              </div>
              <ConfigRow label="Last Check" value={new Date(crankerHealth.timestamp).toLocaleString()} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-sm font-medium text-red-400">Unreachable</span>
            </div>
          )}
        </Card>
      </div>

      {/* Vault Health */}
      <div className="mt-6">
        <Card title="Vault Health">
          {healthSummary && (
            <div className="mb-5 grid grid-cols-4 gap-3">
              <HealthStat label="Total" value={healthSummary.total} />
              <HealthStat label="Active" value={healthSummary.active} color="text-pump-green" />
              <HealthStat label="Paused" value={healthSummary.paused} color={healthSummary.paused > 0 ? "text-red-400" : "text-pump-muted"} />
              <HealthStat label="Erroring" value={healthSummary.erroring} color={healthSummary.erroring > 0 ? "text-yellow-400" : "text-pump-muted"} />
            </div>
          )}
          {vaultHealth.length === 0 ? (
            <p className="text-sm text-pump-muted">No vaults found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-pump-border/40 text-xs text-pump-muted">
                    <th className="pb-2 pr-4 font-medium">Token</th>
                    <th className="pb-2 pr-4 font-medium">Mint</th>
                    <th className="pb-2 pr-4 font-medium text-center">Status</th>
                    <th className="pb-2 pr-4 font-medium text-right">Failures</th>
                    <th className="pb-2 pr-4 font-medium">Error</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultHealth.map((v) => (
                    <tr key={v.mint} className="border-b border-pump-border/20 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-white">{v.name}</span>
                        <span className="ml-1.5 text-pump-muted">${v.symbol}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-pump-muted">
                        {shortenAddress(v.mint, 4, 4)}
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        {v.active && (!v.vaultCreated || !v.feeSharingConfirmed) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            Unconfirmed
                          </span>
                        ) : v.active ? (
                          v.consecutiveFailures > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                              Degraded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pump-green/10 px-2 py-0.5 text-[11px] font-medium text-pump-green">
                              <span className="h-1.5 w-1.5 rounded-full bg-pump-green" />
                              Healthy
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs">
                        <span className={v.consecutiveFailures > 0 ? "text-yellow-400" : "text-pump-muted"}>
                          {v.consecutiveFailures}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {v.lastErrorType ? (
                          <span className={`rounded bg-pump-dark px-1.5 py-0.5 font-mono text-[11px] ${
                            v.lastErrorType === "INVALID_MINT" ? "text-red-400" :
                            v.lastErrorType === "PLATFORM_PAUSED" ? "text-orange-400" :
                            v.lastErrorType === "RPC_RATE_LIMIT" ? "text-yellow-400" :
                            "text-pump-muted"
                          }`}>
                            {v.lastErrorType}
                          </span>
                        ) : (
                          <span className="text-xs text-pump-muted">-</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {v.pauseReason ? (
                          <span className="max-w-[200px] truncate text-xs text-red-400" title={v.pauseReason}>
                            {v.pauseReason}
                          </span>
                        ) : (
                          <span className="text-xs text-pump-muted">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(!v.vaultCreated || !v.feeSharingConfirmed) && (
                            <button
                              onClick={() => handleVaultVerify(v.mint)}
                              disabled={vaultActionPending === v.mint}
                              className="shrink-0 rounded-md bg-yellow-500/10 px-2 py-1 text-[11px] font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20 disabled:opacity-40"
                            >
                              {vaultActionPending === v.mint ? "..." : "Verify"}
                            </button>
                          )}
                          {v.active ? (
                            <button
                              onClick={() => handleVaultAction(v.mint, "pause")}
                              disabled={vaultActionPending === v.mint}
                              className="shrink-0 rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                            >
                              {vaultActionPending === v.mint ? "..." : "Pause"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVaultAction(v.mint, "reactivate")}
                              disabled={vaultActionPending === v.mint}
                              className="shrink-0 rounded-md bg-pump-green/10 px-2 py-1 text-[11px] font-medium text-pump-green transition-colors hover:bg-pump-green/20 disabled:opacity-40"
                            >
                              {vaultActionPending === v.mint ? "..." : "Reactivate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* LP Automation */}
      <div className="mt-6">
        <Card title="LP Automation">
          {lpSummary ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HealthStat label="Graduated Vaults" value={lpSummary.graduatedVaults} color="text-yellow-400" />
                <HealthStat label="LP Deployed" value={lpSummary.lpDeployedVaults} color="text-pump-cyan" />
                <LpSolStat label="Pending LP SOL" value={lamportsToSol(lpSummary.totalPendingLpSol)} />
                <LpSolStat label="LP SOL Deposited" value={lamportsToSol(lpSummary.totalLpSolDeposited)} />
              </div>
              <div className="mb-3 text-xs text-pump-muted">
                Total Platform Fees Collected: <span className="font-mono text-white">{lamportsToSol(lpSummary.totalPlatformFees)} SOL</span>
              </div>
              {lpSummary.vaults.length === 0 ? (
                <p className="text-sm text-pump-muted">No active vaults.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-pump-border/40 text-xs text-pump-muted">
                        <th className="pb-2 pr-4 font-medium">Token</th>
                        <th className="pb-2 pr-4 font-medium">Mint</th>
                        <th className="pb-2 pr-4 font-medium text-center">Graduated</th>
                        <th className="pb-2 pr-4 font-medium text-center">LP Status</th>
                        <th className="pb-2 pr-4 font-medium text-right">Pending LP</th>
                        <th className="pb-2 pr-4 font-medium text-right">LP Deposited</th>
                        <th className="pb-2 font-medium">Pool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lpSummary.vaults.map((v) => (
                        <tr key={v.mint} className="border-b border-pump-border/20 last:border-0">
                          <td className="py-2.5 pr-4">
                            <span className="font-medium text-white">{v.name}</span>
                            <span className="ml-1.5 text-pump-muted">${v.symbol}</span>
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-pump-muted">
                            {shortenAddress(v.mint, 4, 4)}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            {v.graduated ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            {v.lpDeployed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-pump-green/10 px-2 py-0.5 text-[11px] font-medium text-pump-green">
                                <span className="h-1.5 w-1.5 rounded-full bg-pump-green" />
                                Deployed
                              </span>
                            ) : !v.graduated ? (
                              <span className="text-xs text-pump-muted">-</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-xs text-pump-cyan">
                            {lamportsToSol(v.pendingLpSol)}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-xs text-pump-cyan">
                            {lamportsToSol(v.lpSolDeposited)}
                          </td>
                          <td className="py-2.5">
                            {v.lpPoolKey ? (
                              <a
                                href={`https://pump.fun/pool/${v.lpPoolKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-pump-cyan underline decoration-pump-cyan/30 hover:decoration-pump-cyan"
                              >
                                {shortenAddress(v.lpPoolKey, 4, 4)}
                              </a>
                            ) : (
                              <span className="text-xs text-pump-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-pump-muted">Loading LP data...</p>
          )}
        </Card>
      </div>

      {/* Vaults Table */}
      <div className="mt-6">
        <Card title={`Vaults (${tokens.length})`}>
          {tokens.length === 0 ? (
            <p className="text-sm text-pump-muted">No active vaults.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-pump-border/40 text-xs text-pump-muted">
                    <th className="pb-2 pr-4 font-medium">Token</th>
                    <th className="pb-2 pr-4 font-medium">Mint</th>
                    <th className="pb-2 pr-4 font-medium text-right">Holders</th>
                    <th className="pb-2 pr-4 font-medium text-right">Distributed</th>
                    <th className="pb-2 font-medium text-right">Epochs</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.mint} className="border-b border-pump-border/20 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-white">{t.name}</span>
                        <span className="ml-1.5 text-pump-muted">${t.symbol}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-pump-muted">
                        {shortenAddress(t.mint, 4, 4)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-white">{t.holderCount}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-white">
                        {lamportsToSol(t.totalDistributed)}
                      </td>
                      <td className="py-2.5 text-right text-white">{t.epochCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AuthGate({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-32 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-pump-border bg-pump-card">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <p className="mb-2 text-base font-medium text-white">{message}</p>
      {detail && <p className="font-mono text-xs text-pump-muted">{detail}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function ConfigRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-pump-border/20 py-2 last:border-0">
      <span className="text-xs text-pump-muted">{label}</span>
      <span className={`font-mono text-xs ${valueClass || "text-white"}`}>{value}</span>
    </div>
  );
}

function HealthStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-pump-border/40 bg-pump-dark px-3 py-2 text-center">
      <p className={`font-mono text-lg font-bold ${color || "text-white"}`}>{value}</p>
      <p className="text-[11px] text-pump-muted">{label}</p>
    </div>
  );
}

function LpSolStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-pump-cyan/20 bg-pump-dark px-3 py-2 text-center">
      <p className="font-mono text-lg font-bold text-pump-cyan">{value}</p>
      <p className="text-[11px] text-pump-muted">{label}</p>
    </div>
  );
}
