import { useState, useRef, useEffect } from "react";
import { useAnvilWallet } from "../hooks/useAnvilWallet";

export function LoginButton() {
  const { publicKey, connected, ready, authenticated, login, logout, balance, xUsername } = useAnvilWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!ready) return null;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-xl bg-gradient-to-r from-pump-accent to-pump-accent-dim px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(124,58,237,0.3)] border border-pump-accent/30"
      >
        Sign In
      </button>
    );
  }

  if (!connected || !publicKey) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-pump-border bg-pump-card px-3.5 py-2 text-[13px] text-pump-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-pump-accent" />
        Loading...
        <button
          onClick={logout}
          className="ml-1 text-[11px] text-red-400 hover:text-red-300"
          title="Log out"
        >
          &times;
        </button>
      </div>
    );
  }

  const addr = publicKey.toBase58();
  const short = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  const displayName = xUsername || short;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-pump-border bg-pump-card px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:border-pump-border-light hover:bg-pump-card-hover"
      >
        <span className="h-2 w-2 rounded-full bg-pump-green" />
        {displayName}
        <Chevron open={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 animate-scale-in rounded-xl border border-pump-border bg-pump-card p-1.5 shadow-xl shadow-black/30 z-50">
          {/* Identity */}
          {xUsername && (
            <div className="mb-1 rounded-lg bg-pump-dark/50 px-3 py-1.5">
              <p className="text-[11px] text-pump-muted">@{xUsername}</p>
            </div>
          )}

          {/* Wallet address */}
          <div className="mb-1.5 rounded-lg bg-pump-dark/50 px-3 py-2">
            <p className="font-mono text-[11px] text-pump-muted">{short}</p>
            {balance !== null && (
              <p className="mt-0.5 font-mono text-[10px] text-pump-green">
                {balance.toFixed(4)} SOL
              </p>
            )}
          </div>

          <DropdownItem
            label="Copy address"
            onClick={() => { navigator.clipboard.writeText(addr); setOpen(false); }}
            icon={<CopyIcon />}
          />
          <DropdownItem
            label="View on Explorer"
            onClick={() => { window.open(`https://solscan.io/account/${addr}`, "_blank"); setOpen(false); }}
            icon={<ExplorerIcon />}
          />

          <div className="my-1 h-px bg-pump-border" />

          <DropdownItem
            label="Log out"
            onClick={() => { logout(); setOpen(false); }}
            icon={<LogoutIcon />}
            danger
          />
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-pump-text hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span className={danger ? "text-red-400/60" : "text-pump-muted"}>{icon}</span>
      {label}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-pump-muted transition-transform ${open ? "rotate-180" : ""}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// --- Icons ---

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ExplorerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
