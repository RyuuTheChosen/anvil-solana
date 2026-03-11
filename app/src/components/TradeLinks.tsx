import { useState, useEffect, useRef } from "react";
import { TRADE_PLATFORMS } from "../lib/tradeLinks";

export function TradeButtons({ mint, bondingCurve }: { mint: string; bondingCurve?: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {TRADE_PLATFORMS.map((p) => (
        <a
          key={p.id}
          href={p.url(mint, bondingCurve)}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-pump-border bg-pump-dark/50 px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-pump-border-light ${p.color} ${p.hoverBg}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span className="hidden sm:inline">{p.name}</span>
        </a>
      ))}
    </div>
  );
}

export function TradeDropdown({ mint, bondingCurve }: { mint: string; bondingCurve?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Trade"
        className="inline-flex items-center justify-center rounded-md p-1 text-pump-muted transition-colors hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 014-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 01-4 4H3" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-2 w-40 rounded-xl border border-pump-border bg-pump-card p-1 shadow-xl shadow-black/40"
        >
          {TRADE_PLATFORMS.map((p) => (
            <a
              key={p.id}
              href={p.url(mint, bondingCurve)}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-pump-text transition-colors ${p.hoverBg} hover:text-white`}
            >
              <span className={`h-2 w-2 rounded-full ${p.color.replace("text-", "bg-")}`} />
              <span className="flex-1">{p.name}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
