const SPLIT_PRESETS = [
  { label: "All Holders", value: 10000 },
  { label: "75 / 25", value: 7500 },
  { label: "50 / 50", value: 5000 },
  { label: "25 / 75", value: 2500 },
  { label: "All LP", value: 0 },
] as const;

interface FeeDistributionSliderProps {
  value: number;
  onChange: (bps: number) => void;
  platformFeeBps?: number;
}

export function FeeDistributionSlider({ value, onChange, platformFeeBps = 1000 }: FeeDistributionSliderProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-pump-border bg-pump-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-pump-muted">Fee Distribution</p>
        <span className="flex items-center gap-1.5 text-[10px] text-pump-muted/60">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          Locked at launch
        </span>
      </div>

      {/* Visual split bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-pump-dark flex">
        <div
          className="h-full rounded-l-full bg-pump-green transition-all duration-300"
          style={{ width: `${value / 100}%` }}
        />
        <div
          className="h-full rounded-r-full bg-pump-cyan transition-all duration-300"
          style={{ width: `${(10000 - value) / 100}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pump-green" />
          <span className="text-pump-green font-medium">Holders: {(value / 100).toFixed(0)}%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pump-cyan" />
          <span className="text-pump-cyan font-medium">LP: {((10000 - value) / 100).toFixed(0)}%</span>
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={10000}
        step={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-pump-green cursor-pointer"
      />

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {SPLIT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
              value === p.value
                ? "bg-pump-green/15 text-pump-green ring-1 ring-pump-green/20"
                : "bg-white/[0.04] text-pump-muted hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-pump-muted">
        {(platformFeeBps / 100).toFixed(0)}% platform fee deducted first. Remaining fees split between direct holder distributions and PumpSwap LP (post-graduation).
      </p>
    </div>
  );
}
