import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { useConnection } from "../contexts/SolanaConnection";
import { Keypair } from "@solana/web3.js";
import { LoginButton } from "../components/LoginButton";
import { buildInstructionSetTransaction, type InstructionSet } from "../lib/sendLaunchTx";
import { Link } from "react-router-dom";
import { AnvilLogo } from "../components/AnvilLogo";
import { FeeDistributionSlider } from "../components/FeeDistributionSlider";
import { fetchPlatformConfig } from "../lib/adminProgram";
import { apiFetch, authApiFetch, custodialSignAndSubmit, sanitizeError } from "../lib/api";

interface LaunchForm {
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
  devBuySol: string;
  maxHolders: number;
  holderSplitBps: number;
  claimExpiryHours: number;
}

const initial: LaunchForm = {
  name: "",
  symbol: "",
  description: "",
  twitter: "",
  telegram: "",
  website: "",
  devBuySol: "",
  maxHolders: 100,
  holderSplitBps: 5000,
  claimExpiryHours: 168,
};

const EXPIRY_PRESETS = [
  { label: "6h", value: 6 },
  { label: "12h", value: 12 },
  { label: "24h", value: 24 },
  { label: "3d", value: 72 },
  { label: "7d", value: 168 },
  { label: "14d", value: 336 },
  { label: "30d", value: 720 },
] as const;

type Status = "idle" | "uploading" | "building" | "signing" | "confirming" | "configure-signing" | "configure-confirming" | "done" | "error";

const launchSteps = [
  { key: "uploading", label: "Uploading metadata" },
  { key: "building", label: "Building transaction" },
  { key: "signing", label: "Signing transaction" },
  { key: "confirming", label: "Confirming on-chain" },
  { key: "configure-signing", label: "Setting up fee sharing" },
  { key: "configure-confirming", label: "Confirming fee sharing" },
] as const;

export function Launch() {
  const { connected, publicKey, getAccessToken } = useAnvilWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState<LaunchForm>(() => {
    // Check for AI chat prefill data
    try {
      const raw = sessionStorage.getItem("anvil-launch-prefill");
      if (raw) {
        sessionStorage.removeItem("anvil-launch-prefill");
        const prefill = JSON.parse(raw);
        return {
          ...initial,
          ...(prefill.name && { name: prefill.name }),
          ...(prefill.symbol && { symbol: prefill.symbol }),
          ...(prefill.description && { description: prefill.description }),
          ...(prefill.twitter && { twitter: prefill.twitter }),
          ...(prefill.telegram && { telegram: prefill.telegram }),
          ...(prefill.website && { website: prefill.website }),
        };
      }
    } catch { /* ignore */ }
    return initial;
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [launchedMint, setLaunchedMint] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [customHolders, setCustomHolders] = useState(false);
  const [buybackEnabled, setBuybackEnabled] = useState(false);
  const [buybackBps, setBuybackBps] = useState(1000);
  const [buybackAction, setBuybackAction] = useState<"hold" | "burn">("hold");
  const [buybackThreshold, setBuybackThreshold] = useState("0.1");
  const [platformFeeBps, setPlatformFeeBps] = useState(1000);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlatformConfig(connection).then((cfg) => {
      if (cfg) setPlatformFeeBps(cfg.platformFeeBps);
    }).catch(() => {});
  }, [connection]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB");
        return;
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setError("");
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);

  // Step 1: Launch token
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    if (!image) { setError("Please upload an image"); return; }

    setError(null);
    setStatus("uploading");

    try {
      const previewData = new FormData();
      previewData.append("image", image);
      previewData.append("name", form.name);
      previewData.append("symbol", form.symbol);
      previewData.append("description", form.description);
      if (form.twitter) previewData.append("twitter", form.twitter);
      if (form.telegram) previewData.append("telegram", form.telegram);
      if (form.website) previewData.append("website", form.website);

      const previewRes = await apiFetch("/api/launch/preview", { method: "POST", body: previewData });
      if (!previewRes.ok) { const err = await previewRes.json(); throw new Error(err.error || "Metadata upload failed"); }
      const { metadataUri, imageUri } = await previewRes.json();

      setStatus("building");

      // First attempt: try vanity pool (no mint in body)
      const buildRes = await apiFetch("/api/launch/build-tx", {
        method: "POST",
        body: JSON.stringify({
          creator: publicKey.toBase58(),
          name: form.name, symbol: form.symbol,
          metadataUri, imageUrl: imageUri,
          devBuySol: form.devBuySol || undefined,
          maxHolders: form.maxHolders, holderSplitBps: form.holderSplitBps,
          claimExpiryHours: form.claimExpiryHours,
        }),
      });
      if (!buildRes.ok) { const err = await buildRes.json(); throw new Error(err.error || "Failed to build transaction"); }
      const buildData = await buildRes.json();

      let mint: string;
      let sig: string;

      if (buildData.isVanity) {
        // Vanity path: TX is already partially signed by backend
        mint = buildData.mint;

        setStatus("signing");
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");
        const result = await custodialSignAndSubmit(token, { serializedTx: buildData.partiallySignedTx });
        sig = result.signature;
      } else {
        // Fallback: pool empty or not available — generate own keypair
        const mintKeypair = Keypair.generate();
        const fallbackRes = await apiFetch("/api/launch/build-tx", {
          method: "POST",
          body: JSON.stringify({
            creator: publicKey.toBase58(),
            mint: mintKeypair.publicKey.toBase58(),
            name: form.name, symbol: form.symbol,
            metadataUri, imageUrl: imageUri,
            devBuySol: form.devBuySol || undefined,
            maxHolders: form.maxHolders, holderSplitBps: form.holderSplitBps,
            claimExpiryHours: form.claimExpiryHours,
          }),
        });
        if (!fallbackRes.ok) { const err = await fallbackRes.json(); throw new Error(err.error || "Failed to build transaction"); }
        const fallbackData = await fallbackRes.json();
        mint = fallbackData.mint;

        setStatus("signing");
        const built = await buildInstructionSetTransaction(connection, fallbackData.instructionSet as InstructionSet, publicKey, mintKeypair);
        if (built.unknownPrograms) throw new Error(`Unknown programs: ${built.unknownPrograms.programIds.join(", ")}`);
        const serializedTx = built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");
        const result = await custodialSignAndSubmit(token, { serializedTx });
        sig = result.signature;
      }

      setStatus("confirming");
      const confirmRes = await apiFetch("/api/launch/confirm", {
        method: "POST",
        body: JSON.stringify({
          mint,
          signature: sig,
          creator: publicKey.toBase58(),
          name: form.name,
          symbol: form.symbol,
          metadataUri,
          imageUrl: imageUri,
          maxHolders: form.maxHolders,
          holderSplitBps: form.holderSplitBps,
          claimExpiryHours: form.claimExpiryHours,
        }),
      });
      if (!confirmRes.ok) {
        // Confirmation API error — token may still be on-chain
        const err = await confirmRes.json().catch(() => ({}));
        console.warn("[launch] Confirm returned non-ok:", err);
      }

      setLaunchedMint(mint);

      // Auto-trigger fee sharing setup (no wallet popup needed with custodial signing)
      setStatus("configure-signing");
      try {
        const cfgBuildRes = await apiFetch("/api/launch/build-configure", {
          method: "POST",
          body: JSON.stringify({ mint, creator: publicKey.toBase58() }),
        });
        if (!cfgBuildRes.ok) { const cfgErr = await cfgBuildRes.json(); throw new Error(cfgErr.error || "Failed to build configure transaction"); }
        const cfgData = await cfgBuildRes.json();

        if (!cfgData.alreadyConfigured) {
          const cfgBuilt = await buildInstructionSetTransaction(connection, cfgData.instructionSet as InstructionSet, publicKey, null);
          if (cfgBuilt.unknownPrograms) throw new Error(`Unknown programs: ${cfgBuilt.unknownPrograms.programIds.join(", ")}`);
          const cfgSerializedTx = cfgBuilt.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
          const cfgToken = await getAccessToken();
          if (!cfgToken) throw new Error("Not authenticated");
          const cfgResult = await custodialSignAndSubmit(cfgToken, { serializedTx: cfgSerializedTx });

          setStatus("configure-confirming");
          const cfgConfirmRes = await apiFetch("/api/launch/confirm-configure", {
            method: "POST",
            body: JSON.stringify({ mint, signature: cfgResult.signature }),
          });
          if (!cfgConfirmRes.ok) { const cfgErr = await cfgConfirmRes.json(); throw new Error(cfgErr.error || "Configure confirmation failed"); }
        }

        setConfigured(true);
        setStatus("done");

        // Configure buyback if enabled (fire-and-forget)
        if (buybackEnabled && mint) {
          try {
            const bbToken = await getAccessToken();
            if (bbToken) {
              const thresholdLamports = Math.max(Math.round(parseFloat(buybackThreshold) * 1e9), 100_000_000);
              await authApiFetch(`/api/vault/${mint}/configure-buyback`, bbToken, {
                method: "POST",
                body: JSON.stringify({
                  enabled: true,
                  buybackSplitBps: buybackBps,
                  buybackAction,
                  buybackThresholdSol: String(thresholdLamports),
                }),
              });
            }
          } catch { /* non-critical */ }
        }
      } catch (cfgErr: any) {
        // Fee sharing setup failed — token is created but not configured
        // Show the manual button as fallback
        setStatus("done");
        setError(sanitizeError(cfgErr instanceof Error ? cfgErr.message : "Fee sharing setup failed. Use the button below to retry."));
      }
    } catch (err: any) {
      setError(sanitizeError(err instanceof Error ? err.message : "An unexpected error occurred"));
      setStatus("error");
    }
  };

  // Step 2: Configure fee sharing + vault
  const onConfigure = async () => {
    if (!connected || !publicKey || !launchedMint) return;

    setError(null);
    setStatus("configure-signing");

    try {
      const buildRes = await apiFetch("/api/launch/build-configure", {
        method: "POST",
        body: JSON.stringify({ mint: launchedMint, creator: publicKey.toBase58() }),
      });
      if (!buildRes.ok) { const err = await buildRes.json(); throw new Error(err.error || "Failed to build configure transaction"); }
      const data = await buildRes.json();

      if (data.alreadyConfigured) {
        setConfigured(true);
        setStatus("done");
        return;
      }

      const built = await buildInstructionSetTransaction(connection, data.instructionSet as InstructionSet, publicKey, null);
      if (built.unknownPrograms) throw new Error(`Unknown programs: ${built.unknownPrograms.programIds.join(", ")}`);
      const serializedTx = built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const configResult = await custodialSignAndSubmit(token, { serializedTx });
      const sig = configResult.signature;

      setStatus("configure-confirming");
      const confirmRes = await apiFetch("/api/launch/confirm-configure", {
        method: "POST",
        body: JSON.stringify({ mint: launchedMint, signature: sig }),
      });
      if (!confirmRes.ok) { const err = await confirmRes.json(); throw new Error(err.error || "Configure confirmation failed"); }

      setConfigured(true);
      setStatus("done");
    } catch (err: any) {
      setError(sanitizeError(err instanceof Error ? err.message : "Configure failed"));
      setStatus("error");
    }
  };

  const hasContent = form.name || form.symbol || form.description || imagePreview;
  const isProcessing = !["idle", "error", "done"].includes(status);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
      {/* Page header */}
      <div className="animate-slide-up mb-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pump-green/10 text-pump-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Launch your token</h1>
        </div>
        <p className="text-sm text-pump-muted">
          Create a PumpFun token with built-in fee sharing for your holders.
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
          <p className="mb-6 text-sm text-pump-muted">You need a Solana wallet to launch a token.</p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          {/* Form */}
          {/* Progress overlay */}
          {isProcessing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="animate-scale-in mx-4 w-full max-w-md rounded-2xl border border-pump-border bg-pump-card p-6 shadow-2xl shadow-black/40">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <svg className="h-5 w-5 animate-spin text-pump-green" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-semibold text-white">
                    {launchSteps.find(s => s.key === status)?.label ?? "Processing..."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {launchSteps.map((step, i) => {
                    const stepKeys = launchSteps.map(s => s.key);
                    const currentIdx = stepKeys.indexOf(status as any);
                    const isComplete = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={step.key} className="flex flex-1 items-center gap-1.5">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                          isComplete ? "bg-pump-green text-pump-dark" :
                          isCurrent ? "bg-pump-green/20 text-pump-green ring-2 ring-pump-green/30" :
                          "bg-pump-border/50 text-pump-muted"
                        }`}>
                          {isComplete ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                        {i < launchSteps.length - 1 && (
                          <div className={`h-px flex-1 ${isComplete ? "bg-pump-green/50" : "bg-pump-border/50"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-pump-muted">
                  {launchSteps.map((step, i) => {
                    const stepKeys = launchSteps.map(s => s.key);
                    const currentIdx = stepKeys.indexOf(status as any);
                    const isComplete = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <span key={step.key} className={`flex-1 text-center ${isComplete ? "text-pump-green" : isCurrent ? "text-white" : ""}`}>
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="animate-slide-up stagger-1 space-y-6 lg:col-span-3">
            {/* Image upload */}
            <div className="rounded-2xl border border-pump-border bg-pump-card p-6">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-pump-muted">Token Image</p>
              <div className="flex items-start gap-6">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  className={`group flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
                    dragOver
                      ? "border-pump-green bg-pump-green/[0.06] scale-105"
                      : imagePreview
                        ? "border-transparent"
                        : "border-pump-border-light hover:border-pump-green/30 hover:bg-pump-green/[0.03]"
                  }`}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-pump-muted transition-colors group-hover:text-pump-green">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-[10px] font-medium">Upload</span>
                    </div>
                  )}
                </button>
                <div className="space-y-1.5 pt-1 text-xs text-pump-muted">
                  <p>Recommended: 512 x 512px</p>
                  <p>Max size: 5 MB</p>
                  <p>PNG, JPG, GIF, or WebP</p>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      className="mt-2 text-[11px] text-red-400 transition-colors hover:text-red-300"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
            </div>

            {/* Token details */}
            <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Token Details</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name" name="name" value={form.name} onChange={onChange} required placeholder="My Token" />
                <Field label="Symbol" name="symbol" value={form.symbol} onChange={onChange} required placeholder="MTK" maxLength={10} />
              </div>
              <div>
                <label className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-pump-muted">Description</span>
                  <span className="text-[10px] tabular-nums text-pump-muted/50">{form.description.length}/200</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                  rows={3}
                  maxLength={200}
                  placeholder="What's your token about?"
                  className="w-full resize-none rounded-xl border border-pump-border bg-pump-dark px-4 py-3 text-sm text-white placeholder:text-pump-muted/40 transition-all focus:border-pump-green/30 focus:bg-pump-darker focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,255,136,0.05)]"
                />
              </div>
            </div>

            {/* Socials */}
            <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Socials</p>
                <span className="text-[10px] text-pump-muted/50">Optional</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Twitter" name="twitter" value={form.twitter} onChange={onChange} placeholder="@handle" icon="twitter" />
                <Field label="Telegram" name="telegram" value={form.telegram} onChange={onChange} placeholder="t.me/group" icon="telegram" />
                <Field label="Website" name="website" value={form.website} onChange={onChange} placeholder="https://..." icon="globe" />
              </div>
            </div>

            {/* Advanced */}
            <details className="group rounded-2xl border border-pump-border bg-pump-card">
              <summary className="cursor-pointer list-none p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Advanced Options</p>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted transition-transform group-open:rotate-180">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </summary>
              <div className="border-t border-pump-border px-6 pb-6 pt-5 space-y-4">
                <Field label="Initial Dev Buy (SOL)" name="devBuySol" value={form.devBuySol} onChange={onChange} placeholder="0 (optional)" type="number" />
                <p className="text-[11px] text-pump-muted">Amount of SOL to buy your own token on launch. Leave empty to skip.</p>
              </div>
            </details>

            {/* Fee Distribution Split */}
            <FeeDistributionSlider
              value={form.holderSplitBps}
              onChange={(bps) => setForm((f) => ({ ...f, holderSplitBps: bps }))}
              platformFeeBps={platformFeeBps}
            />

            {/* Claim Expiry */}
            <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Claim Expiry</p>
                <p className="mt-1 text-[11px] text-pump-muted/60">
                  Unclaimed distributions expire and are redistributed to active holders
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPIRY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, claimExpiryHours: preset.value }))}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                      form.claimExpiryHours === preset.value
                        ? "bg-pump-green/15 text-pump-green ring-1 ring-pump-green/20"
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
                    {customHolders ? `Top ${form.maxHolders} holders earn fees` : "Default: top 100 holders earn fees"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const wasOn = customHolders;
                    setCustomHolders(!wasOn);
                    if (wasOn) setForm((f) => ({ ...f, maxHolders: 100 }));
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${customHolders ? "bg-pump-green" : "bg-pump-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${customHolders ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {customHolders && (
                <div className="animate-scale-in">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-pump-muted">Holder limit</span>
                    <span className="rounded-md bg-pump-green/10 px-2 py-0.5 font-mono text-xs font-bold text-pump-green">{form.maxHolders}</span>
                  </div>
                  <div className="mb-3 flex gap-2">
                    {[100, 200, 256, 350, 512].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, maxHolders: v }))}
                        className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                          form.maxHolders === v
                            ? "bg-pump-green/15 text-pump-green ring-1 ring-pump-green/20"
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
                    value={form.maxHolders}
                    onChange={(e) => setForm((f) => ({ ...f, maxHolders: parseInt(e.target.value, 10) }))}
                    className="w-full accent-pump-green cursor-pointer"
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
                  className={`relative h-6 w-11 rounded-full transition-colors ${buybackEnabled ? "bg-pump-green" : "bg-pump-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${buybackEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {buybackEnabled && (
                <div className="animate-scale-in space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-pump-muted">Buyback Split</span>
                      <span className="font-mono text-[11px] font-medium text-pump-green">{(buybackBps / 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={10000 - form.holderSplitBps}
                      step={100}
                      value={buybackBps}
                      onChange={(e) => setBuybackBps(parseInt(e.target.value, 10))}
                      className="w-full accent-pump-green cursor-pointer"
                    />
                    <div className="mt-1 flex justify-between text-[9px] text-pump-muted">
                      <span>1%</span>
                      <span>LP gets the rest</span>
                    </div>
                  </div>

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
                              ? "bg-pump-green/15 text-pump-green ring-1 ring-pump-green/20"
                              : "bg-white/[0.04] text-pump-muted hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-[11px] text-pump-muted">Threshold (min 0.1 SOL)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={buybackThreshold}
                        onChange={(e) => setBuybackThreshold(e.target.value)}
                        className="w-full rounded-lg border border-pump-border bg-pump-dark px-3 py-2 font-mono text-xs text-white outline-none focus:border-pump-green/30"
                      />
                      <span className="text-[11px] text-pump-muted">SOL</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            {!launchedMint && (
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-glow group w-full rounded-xl bg-pump-green py-4 text-sm font-bold text-pump-dark transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
              >
                {isProcessing ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Processing...
                  </span>
                ) : status === "error" ? "Try Again" : "Launch Token"}
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="animate-scale-in flex items-start gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.06] p-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Success: Token created */}
            {launchedMint && (
              <div className="animate-scale-in rounded-xl border border-pump-green/15 bg-pump-green/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pump-green/20 text-pump-green">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-pump-green">Token created successfully!</p>
                    <p className="text-xs text-pump-muted">
                      Mint: <span className="font-mono break-all text-white">{launchedMint}</span>
                    </p>
                    <div className="flex gap-3 pt-1">
                      <a href={`https://solscan.io/token/${launchedMint}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-pump-cyan transition-colors hover:bg-white/[0.08]">
                        View on Solscan
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      </a>
                      <a href={`https://pump.fun/coin/${launchedMint}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-pump-cyan transition-colors hover:bg-white/[0.08]">
                        View on PumpFun
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 fallback: Retry configure if auto-configure failed */}
            {launchedMint && !configured && status !== "configure-signing" && status !== "configure-confirming" && (
              <div className="animate-scale-in rounded-xl border border-pump-accent/20 bg-pump-accent/[0.06] p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pump-accent/20 text-pump-accent">
                    <AnvilLogo size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-pump-accent">Fee sharing setup needed</p>
                    <p className="mt-1 text-xs text-pump-muted">
                      Auto-setup didn't complete. Click below to retry setting up fee distribution.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onConfigure}
                  className="w-full rounded-lg bg-pump-accent/20 py-2.5 text-sm font-semibold text-pump-accent transition-colors hover:bg-pump-accent/30"
                >
                  Retry Fee Sharing Setup
                </button>
              </div>
            )}

            {/* Fully complete */}
            {launchedMint && configured && (
              <div className="animate-scale-in rounded-xl border border-pump-green/15 bg-pump-green/[0.06] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <AnvilLogo size={16} />
                  <p className="text-sm text-pump-green">Anvil Protocol fee sharing is active! Rewards are automatically distributed to holder wallets.</p>
                </div>
                <Link
                  to={`/vault/${launchedMint}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-pump-green px-4 py-2 text-xs font-bold text-pump-dark transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Vault Dashboard
                </Link>
              </div>
            )}
          </form>

          {/* Live Preview */}
          <div className="animate-slide-up stagger-3 lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Live Preview</p>
                <span className="flex items-center gap-1.5 text-[10px] text-pump-muted">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-pump-green" />
                  Updating
                </span>
              </div>

              {/* Card */}
              <div className="overflow-hidden rounded-2xl border border-pump-border bg-pump-card shadow-lg shadow-black/20">
                {/* Image */}
                <div className="relative aspect-square w-full bg-pump-dark">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Token" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-pump-border-light">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="text-xs text-pump-muted/40">Token image</span>
                    </div>
                  )}
                  {form.symbol && (
                    <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                      ${form.symbol.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-pump-accent/30" />
                    <span className="text-[11px] text-pump-muted">
                      Created by {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "you"}
                    </span>
                  </div>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-white">
                      {form.name || <span className="text-pump-muted/30">Token Name</span>}
                    </h3>
                    {form.symbol && (
                      <span className="text-xs font-medium text-pump-muted">(ticker: {form.symbol.toUpperCase()})</span>
                    )}
                  </div>
                  <p className="mb-4 text-[13px] leading-relaxed text-pump-muted">
                    {form.description || <span className="italic text-pump-muted/25">No description yet...</span>}
                  </p>
                  {(form.twitter || form.telegram || form.website) && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      {form.twitter && <SocialBadge icon="twitter" value={form.twitter} />}
                      {form.telegram && <SocialBadge icon="telegram" value={form.telegram} />}
                      {form.website && <SocialBadge icon="globe" value={form.website} />}
                    </div>
                  )}
                  <div className="space-y-3 border-t border-pump-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-pump-muted">Market cap</span>
                      <span className="font-mono text-xs font-medium text-white">$0.00</span>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-pump-muted">Bonding curve</span>
                        <span className="font-mono text-[11px] text-pump-green">0%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-pump-dark">
                        <div className="h-full w-0 rounded-full bg-pump-green" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anvil badge + split info */}
                <div className="border-t border-pump-border bg-pump-green/[0.04] px-5 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AnvilLogo size={14} />
                    <span className="text-[11px] font-medium text-pump-green">Anvil Protocol fee sharing enabled</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-pump-muted">
                    <span>Platform: {(platformFeeBps / 100).toFixed(0)}%</span>
                    <span>Holders: {((form.holderSplitBps / 10000) * (100 - platformFeeBps / 100)).toFixed(1)}%</span>
                    <span>LP: {(((10000 - form.holderSplitBps) / 10000) * (100 - platformFeeBps / 100)).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-pump-muted">
                    <span>Max holders: {form.maxHolders}</span>
                    <span>Claim expiry: {EXPIRY_PRESETS.find((p) => p.value === form.claimExpiryHours)?.label ?? `${form.claimExpiryHours}h`}</span>
                  </div>
                </div>
              </div>

              {!hasContent && (
                <p className="mt-4 text-center text-[11px] text-pump-muted/40">
                  Start filling in the form to see the preview update live.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SocialBadge({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-pump-muted">
      {icon === "twitter" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      )}
      {icon === "telegram" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
      )}
      {icon === "globe" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
      )}
      {value}
    </span>
  );
}

function Field({
  label, name, value, onChange, placeholder, required, type = "text", icon: _icon, maxLength,
}: {
  label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; type?: string; icon?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-pump-muted">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        maxLength={maxLength}
        className="w-full rounded-xl border border-pump-border bg-pump-dark px-4 py-3 text-sm text-white placeholder:text-pump-muted/40 transition-all focus:border-pump-green/30 focus:bg-pump-darker focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,255,136,0.05)]"
      />
    </div>
  );
}
