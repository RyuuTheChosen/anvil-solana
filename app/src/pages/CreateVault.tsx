import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { useConnection } from "../contexts/SolanaConnection";
import { LoginButton } from "../components/LoginButton";
import { buildInstructionSetTransaction, type InstructionSet } from "../lib/sendLaunchTx";
import { apiFetch, authApiFetch, custodialSignAndSubmit, sanitizeError } from "../lib/api";
import { isValidBase58 } from "../lib/validate";
import { FeeDistributionSlider } from "../components/FeeDistributionSlider";
import { fetchPlatformConfig } from "../lib/adminProgram";

type FeeSharingStatus =
  | "will_configure"
  | "will_update"
  | "already_ours"
  | "revoked_correct"
  | "revoked_wrong_target";

type Step = "input" | "ready" | "signing" | "confirming" | "done" | "error";

interface BuildResult {
  instructionSet: InstructionSet;
  feeAccount: string;
  feeSharingStatus: FeeSharingStatus;
  isGraduated: boolean;
}

// Re-use shared validation
const isValidPubkey = isValidBase58;

const STATUS_LABELS: Record<FeeSharingStatus, string> = {
  will_configure: "Fee sharing will be configured automatically",
  will_update: "Fee sharing will be updated to point to Anvil vault",
  already_ours: "Fee sharing already configured for Anvil",
  revoked_correct: "Fee sharing already locked to Anvil vault",
  revoked_wrong_target: "Fee sharing is locked to a different address",
};

export function CreateVault() {
  const navigate = useNavigate();
  const { publicKey, connected, getAccessToken } = useAnvilWallet();
  const { connection } = useConnection();

  const [mintAddress, setMintAddress] = useState("");
  const [holderSplitBps, setHolderSplitBps] = useState(5000);
  const [maxHolders, setMaxHolders] = useState(100);
  const [customHolders, setCustomHolders] = useState(false);
  const [claimExpiryHours, setClaimExpiryHours] = useState(168);
  const [buybackEnabled, setBuybackEnabled] = useState(false);
  const [buybackBps, setBuybackBps] = useState(1000);
  const [buybackAction, setBuybackAction] = useState<"hold" | "burn">("hold");
  const [buybackThreshold, setBuybackThreshold] = useState("0.1");
  const [step, setStep] = useState<Step>("input");
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [platformFeeBps, setPlatformFeeBps] = useState(1000);

  useEffect(() => {
    fetchPlatformConfig(connection).then((cfg) => {
      if (cfg) setPlatformFeeBps(cfg.platformFeeBps);
    }).catch(() => {});
  }, [connection]);

  const resetToInput = () => {
    setStep("input");
    setBuildResult(null);
    setError(null);
    setTxSignature(null);
  };

  const handleBuild = async () => {
    if (!publicKey || !mintAddress) return;

    if (!isValidPubkey(mintAddress)) {
      setError("Invalid mint address format");
      setStep("error");
      return;
    }

    setError(null);
    setStep("signing"); // Show loading while building

    try {
      const res = await apiFetch("/api/vault/build-create", {
        method: "POST",
        body: JSON.stringify({ mint: mintAddress, creator: publicKey.toBase58(), maxHolders, holderSplitBps, claimExpiryHours }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Vault already exists — redirect (validate target is a safe internal path)
        if (res.status === 409 && data.vaultDashboard) {
          const target = String(data.vaultDashboard);
          const match = target.match(/^\/vault\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
          if (match) {
            navigate(target);
          } else {
            setError("Vault already exists");
            setStep("error");
          }
          return;
        }
        setError(data.error || "Failed to prepare vault creation");
        setStep("error");
        return;
      }

      setBuildResult(data);
      setStep("ready");
    } catch (err) {
      setError("Network error — could not reach the server");
      setStep("error");
    }
  };

  const handleSign = async () => {
    if (!publicKey || !buildResult) return;

    setStep("signing");
    setError(null);

    try {
      const built = await buildInstructionSetTransaction(connection, buildResult.instructionSet, publicKey, null);
      if (built.unknownPrograms) throw new Error(`Unknown programs: ${built.unknownPrograms.programIds.join(", ")}`);
      const serializedTx = built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const result = await custodialSignAndSubmit(token, { serializedTx });
      const sig = result.signature;

      setTxSignature(sig);
      setStep("confirming");

      // Confirm with backend
      const res = await apiFetch("/api/vault/confirm-create", {
        method: "POST",
        body: JSON.stringify({
          mint: mintAddress,
          signature: sig,
          creator: publicKey.toBase58(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Confirmation failed");
        setStep("error");
        return;
      }

      setStep("done");

      // Configure buyback if enabled (fire-and-forget, vault is already created)
      if (buybackEnabled) {
        try {
          const bbToken = await getAccessToken();
          if (bbToken) {
            const thresholdLamports = Math.max(Math.round(parseFloat(buybackThreshold) * 1e9), 100_000_000);
            await authApiFetch(`/api/vault/${mintAddress}/configure-buyback`, bbToken, {
              method: "POST",
              body: JSON.stringify({
                enabled: true,
                buybackSplitBps: buybackBps,
                buybackAction,
                buybackThresholdSol: String(thresholdLamports),
              }),
            });
          }
        } catch { /* non-critical — creator can configure later from dashboard */ }
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error("[CreateVault] Transaction error:", err);
        if (err && typeof err === "object") {
          console.error("[CreateVault] Error keys:", Object.keys(err));
          console.error("[CreateVault] Full error JSON:", JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2));
          if ("logs" in err) console.error("[CreateVault] Program logs:", (err as any).logs);
          if ("message" in err) console.error("[CreateVault] Message:", (err as any).message);
        }
      }
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(sanitizeError(msg));
      setStep("error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      {/* Header */}
      <div className="animate-slide-up mb-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pump-accent/10 text-pump-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Vault</h1>
        </div>
        <p className="text-sm text-pump-muted">
          Already launched on PumpFun? Create a vault to share fees with your holders.
        </p>
      </div>

      {/* Connect wallet prompt */}
      {!connected ? (
        <div className="animate-scale-in rounded-2xl border border-pump-border bg-pump-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pump-accent/10 text-pump-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="mb-2 font-semibold text-white">Connect your wallet</p>
          <p className="mb-6 text-sm text-pump-muted">You must be the token creator to create a vault.</p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>

      /* Success */
      ) : step === "done" && buildResult ? (
        <SuccessView
          feeAccount={buildResult.feeAccount}
          feeSharingStatus={buildResult.feeSharingStatus}
          txSignature={txSignature}
          mint={mintAddress}
        />

      /* Review & confirm */
      ) : step === "ready" && buildResult ? (
        <div className="animate-scale-in space-y-6">
          <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">Review Transaction</p>

            <div className="space-y-4">
              <ReviewRow
                label="Token Mint"
                value={`${mintAddress.slice(0, 8)}...${mintAddress.slice(-6)}`}
                mono
              />
              <ReviewRow
                label="Fee Sharing"
                value={STATUS_LABELS[buildResult.feeSharingStatus]}
              />
              <ReviewRow
                label="Fee Account PDA"
                value={`${buildResult.feeAccount.slice(0, 8)}...${buildResult.feeAccount.slice(-6)}`}
                mono
              />
              <ReviewRow
                label="Token Status"
                value={buildResult.isGraduated ? "Graduated (PumpSwap)" : "Bonding Curve"}
              />
              <ReviewRow
                label="Instructions"
                value={`${buildResult.instructionSet.instructions.length} instruction${buildResult.instructionSet.instructions.length > 1 ? "s" : ""}`}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-pump-border/50 bg-pump-dark/50 px-4 py-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-pump-muted/60">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[11px] leading-relaxed text-pump-muted/70">
              Your wallet may warn about an "unrecognized program" — this is PumpFun's fee sharing program. It is safe to approve.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetToInput}
              className="flex-1 rounded-xl border border-pump-border bg-pump-card py-4 text-sm font-medium text-pump-muted transition-colors hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleSign}
              className="btn-glow flex-[2] rounded-xl bg-pump-accent py-4 text-sm font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
            >
              Sign & Create Vault
            </button>
          </div>
        </div>

      /* Signing / Confirming */
      ) : step === "signing" || step === "confirming" ? (
        <div className="animate-scale-in rounded-2xl border border-pump-border bg-pump-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pump-accent/10">
            <svg className="h-8 w-8 animate-spin text-pump-accent" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mb-2 font-semibold text-white">
            {step === "signing" ? "Preparing transaction..." : "Confirming on-chain..."}
          </p>
          <p className="text-sm text-pump-muted">
            {step === "signing"
              ? "Please approve the transaction in your wallet"
              : "Waiting for blockchain confirmation"}
          </p>
        </div>

      /* Error */
      ) : step === "error" ? (
        <div className="animate-scale-in space-y-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="mb-2 font-semibold text-white">Something went wrong</p>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
          <button
            onClick={resetToInput}
            className="w-full rounded-xl border border-pump-border bg-pump-card py-4 text-sm font-medium text-pump-muted transition-colors hover:text-white"
          >
            Try Again
          </button>
        </div>

      /* Input form (default) */
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); handleBuild(); }}
          className="animate-slide-up stagger-1 space-y-6"
        >
          <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Token Information</p>
            <div>
              <label className="mb-2 block text-xs font-medium text-pump-muted">Token Mint Address</label>
              <input
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value.trim())}
                required
                placeholder="Enter the SPL token mint address..."
                className="w-full rounded-xl border border-pump-border bg-pump-dark px-4 py-3 font-mono text-sm text-white placeholder:text-pump-muted/40 transition-all focus:border-pump-accent/30 focus:bg-pump-darker focus:outline-none focus:shadow-[0_0_0_3px_rgba(124,58,237,0.05)]"
              />
            </div>
            <p className="text-[11px] text-pump-muted">
              You must be the creator of this token. The vault will be linked to this mint address.
            </p>
          </div>

          <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">What happens next</h3>
            <div className="space-y-4">
              {[
                { num: "1", text: "Vault is created on-chain with fee and pool PDAs", color: "accent" as const },
                { num: "2", text: "Fee sharing is configured to point to Anvil vault", color: "accent" as const },
                { num: "3", text: "Creator fees flow into the vault automatically", color: "green" as const },
                { num: "4", text: `Top ${maxHolders} holders receive rewards directly to their wallets`, color: "green" as const },
                { num: "5", text: `Inactive holder allocations expire after ${claimExpiryHours < 24 ? `${claimExpiryHours}h` : `${Math.round(claimExpiryHours / 24)}d`} and are redistributed to current holders`, color: "green" as const },
              ].map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                    s.color === "green" ? "bg-pump-green/10 text-pump-green" : "bg-pump-accent/10 text-pump-accent"
                  }`}>
                    {s.num}
                  </div>
                  <p className="text-xs leading-relaxed text-pump-muted pt-1">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Distribution Split */}
          <FeeDistributionSlider value={holderSplitBps} onChange={setHolderSplitBps} platformFeeBps={platformFeeBps} />

          {/* Claim Expiry */}
          <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Claim Expiry</p>
              <p className="mt-1 text-[11px] text-pump-muted/60">
                Unclaimed distributions expire and are redistributed to active holders
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "6h", value: 6 },
                { label: "12h", value: 12 },
                { label: "24h", value: 24 },
                { label: "3d", value: 72 },
                { label: "7d", value: 168 },
                { label: "14d", value: 336 },
                { label: "30d", value: 720 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setClaimExpiryHours(preset.value)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                    claimExpiryHours === preset.value
                      ? "bg-pump-accent/15 text-pump-accent ring-1 ring-pump-accent/20"
                      : "bg-white/[0.04] text-pump-muted hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Holders Toggle + Slider */}
          <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Max Holders</p>
                <p className="mt-1 text-[11px] text-pump-muted/60">
                  {customHolders ? `Top ${maxHolders} holders earn fees` : "Default: top 100 holders earn fees"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const wasOn = customHolders;
                  setCustomHolders(!wasOn);
                  if (wasOn) setMaxHolders(100);
                }}
                className={`relative h-6 w-11 rounded-full transition-colors ${customHolders ? "bg-pump-accent" : "bg-pump-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${customHolders ? "translate-x-5" : ""}`} />
              </button>
            </div>

            {customHolders && (
              <div className="animate-scale-in">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-pump-muted">Holder limit</span>
                  <span className="rounded-md bg-pump-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-pump-accent">{maxHolders}</span>
                </div>
                <div className="mb-3 flex gap-2">
                  {[100, 200, 256, 350, 512].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMaxHolders(v)}
                      className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                        maxHolders === v
                          ? "bg-pump-accent/15 text-pump-accent ring-1 ring-pump-accent/20"
                          : "bg-white/[0.04] text-pump-muted hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={100}
                  max={512}
                  step={1}
                  value={maxHolders}
                  onChange={(e) => setMaxHolders(parseInt(e.target.value, 10))}
                  className="w-full accent-pump-accent cursor-pointer"
                />
                <p className="mt-3 text-[11px] text-pump-muted">
                  More holders = wider distribution. Fewer = bigger rewards per holder.
                </p>
              </div>
            )}
          </div>

          {/* Buyback Toggle */}
          <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Buyback</p>
                <p className="mt-1 text-[11px] text-pump-muted/60">
                  {buybackEnabled ? "Auto-purchase tokens with a portion of fees" : "Disabled by default"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuybackEnabled(!buybackEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${buybackEnabled ? "bg-pump-accent" : "bg-pump-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${buybackEnabled ? "translate-x-5" : ""}`} />
              </button>
            </div>

            {buybackEnabled && (
              <div className="animate-scale-in space-y-4">
                {/* Split slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] text-pump-muted">Buyback Split</span>
                    <span className="font-mono text-[11px] font-medium text-pump-accent">{(buybackBps / 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={10000 - holderSplitBps}
                    step={100}
                    value={buybackBps}
                    onChange={(e) => setBuybackBps(parseInt(e.target.value, 10))}
                    className="w-full accent-pump-accent cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-[9px] text-pump-muted">
                    <span>1%</span>
                    <span>LP gets the rest</span>
                  </div>
                </div>

                {/* Action */}
                <div>
                  <span className="mb-2 block text-[11px] text-pump-muted">Action</span>
                  <div className="flex gap-2">
                    {(["hold", "burn"] as const).map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => setBuybackAction(action)}
                        className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-medium capitalize transition-all ${
                          buybackAction === action
                            ? "bg-pump-accent/15 text-pump-accent ring-1 ring-pump-accent/20"
                            : "bg-white/[0.04] text-pump-muted hover:bg-white/[0.07] hover:text-white"
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
                      value={buybackThreshold}
                      onChange={(e) => setBuybackThreshold(e.target.value)}
                      className="w-full rounded-lg border border-pump-border bg-pump-dark px-3 py-2 font-mono text-xs text-white outline-none focus:border-pump-accent/30"
                    />
                    <span className="text-[11px] text-pump-muted">SOL</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!mintAddress}
            className="btn-glow group w-full rounded-xl bg-pump-accent py-4 text-sm font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create Vault
          </button>
        </form>
      )}
    </div>
  );
}

function SuccessView({
  feeAccount,
  feeSharingStatus,
  txSignature,
  mint,
}: {
  feeAccount: string;
  feeSharingStatus: FeeSharingStatus;
  txSignature: string | null;
  mint: string;
}) {
  const navigate = useNavigate();
  const isAutoConfigured = feeSharingStatus === "will_configure" || feeSharingStatus === "will_update" || feeSharingStatus === "already_ours";

  return (
    <div className="animate-scale-in space-y-6">
      <div className="rounded-2xl border border-pump-border bg-pump-card overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-pump-green/30 to-transparent" />
        <div className="p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pump-green/10 text-pump-green">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Vault Created!</h2>
          <p className="mb-8 text-sm text-pump-muted">
            {isAutoConfigured
              ? "Fee sharing is configured. Creator fees will flow to your vault automatically."
              : "Your vault is live. Set the fee address below on PumpFun to start collecting fees."}
          </p>

          {txSignature && (
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-1.5 text-xs text-pump-accent hover:underline"
            >
              View transaction
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}

          <div className="mb-8 rounded-xl border border-pump-green/10 bg-pump-green/[0.03] p-5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pump-muted">Fee Account PDA</p>
            <p className="break-all font-mono text-sm text-pump-green">{feeAccount}</p>
          </div>

          {!isAutoConfigured && (
            <div className="mb-8 rounded-xl border border-pump-border bg-pump-dark p-5 text-left">
              <p className="mb-4 text-xs font-semibold text-white">Manual setup required:</p>
              <div className="space-y-3">
                {[
                  "Copy the Fee Account PDA above",
                  "Go to PumpFun creator settings for your token",
                  "Set the fee sharing address to the PDA",
                  "Fees will start flowing to your vault automatically",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pump-green/10 text-[10px] font-bold text-pump-green">
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed text-pump-muted">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate(`/vault/${mint}`)}
            className="btn-glow w-full rounded-xl bg-pump-accent py-4 text-sm font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
          >
            Go to Vault Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-pump-dark/50 px-4 py-3">
      <span className="text-xs text-pump-muted">{label}</span>
      <span className={`text-xs text-white ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
