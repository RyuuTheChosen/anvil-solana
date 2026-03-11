import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  staticFile,
} from "remotion";
import { C } from "../colors";
import { Background } from "../effects";

/*
 * ANALYTICS SHOWCASE — 13s composition (390 frames @ 30fps)
 *
 * Twitter/X promo — fast-paced, eye-catching, autoplay-optimized
 *
 * Scene 1: BeatTitle         (0-60, 2s)     — "ANALYTICS" slam + vault header
 * Scene 2: BeatSummaryCards  (60-150, 3s)   — Four stat cards rapid-fire
 * Scene 3: BeatCharts        (150-240, 3s)  — Three charts cycle
 * Scene 4: BeatLpAnalytics   (240-300, 2s)  — LP status panel
 * Scene 5: BeatTable         (300-345, 1.5s)— Distribution history rows
 * Scene 6: BeatClose         (345-390, 1.5s)— Logo + tagline
 */


// ── Mock Data ──

const MOCK_TOKEN = { name: "Forge", symbol: "FORGE", mint: "7xKp...anvi1" };

const MOCK_EPOCHS = [
  { epoch: 1, amount: 0.42, cumulative: 0.42, holders: 89, date: "Jan 12" },
  { epoch: 2, amount: 0.91, cumulative: 1.33, holders: 124, date: "Jan 13" },
  { epoch: 3, amount: 1.28, cumulative: 2.61, holders: 178, date: "Jan 14" },
  { epoch: 4, amount: 1.65, cumulative: 4.26, holders: 215, date: "Jan 15" },
  { epoch: 5, amount: 2.14, cumulative: 6.40, holders: 256, date: "Jan 16" },
  { epoch: 6, amount: 1.87, cumulative: 8.27, holders: 298, date: "Jan 17" },
  { epoch: 7, amount: 2.31, cumulative: 10.58, holders: 330, date: "Jan 18" },
  { epoch: 8, amount: 1.79, cumulative: 12.37, holders: 347, date: "Jan 19" },
];

const MOCK_STATS = [
  { label: "Total Revenue", value: "12.43", suffix: " SOL", color: C.green },
  { label: "Distributions", value: "8", suffix: "", color: C.white },
  { label: "Current Holders", value: "347", suffix: "", color: C.white },
  { label: "Avg / Epoch", value: "1.55", suffix: " SOL", color: C.cyan },
];

/* ═══════════════════ MAIN COMPOSITION ═══════════════════ */

export const AnalyticsShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <AbsoluteFill>
        <Background />

        <Sequence from={0} durationInFrames={60}>
          <BeatTitle />
        </Sequence>

        <Sequence from={60} durationInFrames={90}>
          <BeatSummaryCards />
        </Sequence>

        <Sequence from={150} durationInFrames={90}>
          <BeatCharts />
        </Sequence>

        <Sequence from={240} durationInFrames={60}>
          <BeatLpAnalytics />
        </Sequence>

        <Sequence from={300} durationInFrames={45}>
          <BeatTable />
        </Sequence>

        <Sequence from={345} durationInFrames={45}>
          <BeatClose />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 1: TITLE ═══════════════════ */

const BeatTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "ANALYTICS" slam
  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 7, stiffness: 200, mass: 0.7 },
  });
  const titleScale = interpolate(titleProgress, [0, 1], [3.5, 1]);
  const titleOp = interpolate(frame, [5, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleBlur = interpolate(frame, [5, 14], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Vault header
  const headerOp = interpolate(frame, [22, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headerY = interpolate(frame, [22, 35], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle
  const subOp = interpolate(frame, [35, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 400, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.cyan}15, transparent)`,
        opacity: interpolate(frame, [0, 30], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />

      {/* ANALYTICS */}
      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`, filter: `blur(${titleBlur}px)`,
        fontSize: 58, fontWeight: 900, letterSpacing: -1,
        background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        fontFamily: C.font, marginBottom: 24,
      }}>
        Anvil Token Analytics
      </div>

      {/* Vault header card */}
      <div style={{
        opacity: headerOp, transform: `translateY(${headerY}px)`,
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 24px", borderRadius: 16,
        border: `1px solid ${C.border}`, backgroundColor: `${C.card}e0`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
      }}>
        {/* Token icon placeholder */}
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, ${C.green}30, ${C.accent}20)`,
          border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: C.white, fontFamily: C.font,
        }}>
          F
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font }}>
            {MOCK_TOKEN.name} Analytics
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
            ${MOCK_TOKEN.symbol} · {MOCK_TOKEN.mint}
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: subOp, fontSize: 14, color: C.muted, fontFamily: C.font, marginTop: 18,
      }}>
        Every SOL. Every epoch. Fully transparent.
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 2: SUMMARY CARDS ═══════════════════ */

const BeatSummaryCards: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Section label */}
      <div style={{
        opacity: interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 5,
        color: C.muted, fontFamily: C.font, marginBottom: 28,
      }}>
        Vault Overview
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        {MOCK_STATS.map((stat, i) => {
          const delay = 8 + i * 10;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 180, mass: 0.7 } });
          const scale = interpolate(progress, [0, 1], [2.2, 1]);
          const op = interpolate(frame - delay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const blur = interpolate(frame - delay, [0, 6], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          // Count-up effect
          const countProgress = interpolate(frame - delay, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const numVal = parseFloat(stat.value);
          const displayVal = stat.value.includes(".")
            ? (numVal * countProgress).toFixed(2)
            : String(Math.round(numVal * countProgress));

          return (
            <div key={stat.label} style={{
              opacity: op, transform: `scale(${scale})`, filter: `blur(${blur}px)`,
              width: 200, padding: "20px 24px", borderRadius: 18,
              backgroundColor: `${C.card}e0`,
              border: `1px solid ${stat.color === C.white ? C.border : `${stat.color}20`}`,
              borderTop: `2px solid ${stat.color === C.white ? C.borderLight : `${stat.color}40`}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 2,
                color: C.muted, fontFamily: C.font, marginBottom: 10,
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, color: stat.color,
                fontFamily: C.mono, letterSpacing: -1,
              }}>
                {displayVal}{stat.suffix}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 3: CHARTS ═══════════════════ */

const CHART_W = 900;
const CHART_H = 300;
const CHART_PAD = { top: 30, right: 30, bottom: 40, left: 70 };

// Chart phase timing: soft crossfades with 10-frame overlaps
const PHASES = [
  { start: 0, drawEnd: 26, fadeOut: [26, 36] },   // cumulative
  { start: 28, drawEnd: 56, fadeOut: [56, 66] },   // per-epoch
  { start: 58, drawEnd: 84, fadeOut: null },        // holders (holds)
] as const;

const chartLabels = [
  { title: "Cumulative Revenue", sub: "Total SOL allocated over time", color: C.green },
  { title: "Revenue per Epoch", sub: "SOL distributed each epoch", color: C.accent },
  { title: "Holder Count", sub: "Eligible holders at each distribution", color: C.cyan },
];

const BeatCharts: React.FC = () => {
  const frame = useCurrentFrame();

  // Container entrance
  const containerOp = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const containerY = interpolate(frame, [0, 10], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Per-phase opacity (smooth crossfade)
  const phaseOp = PHASES.map((p, idx) => {
    const fadeIn = interpolate(frame, [p.start, p.start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const fadeOut = p.fadeOut
      ? interpolate(frame, p.fadeOut, [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 1;
    return fadeIn * fadeOut;
  });

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: containerOp, transform: `translateY(${containerY}px)`,
    }}>
      {/* Chart titles — each label crossfades independently */}
      <div style={{ position: "relative", height: 42, width: CHART_W + 40, marginBottom: 8 }}>
        {chartLabels.map((label, i) => (
          <div key={label.title} style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: phaseOp[i],
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", backgroundColor: label.color,
              boxShadow: `0 0 14px ${label.color}50`,
            }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: C.font }}>
              {label.title}
            </span>
            <span style={{
              fontSize: 11, color: C.muted, fontFamily: C.font,
              padding: "3px 10px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.03)",
            }}>
              {label.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Chart container */}
      <div style={{
        width: CHART_W + 40, height: CHART_H + 40, padding: "20px", borderRadius: 22,
        border: `1px solid ${C.border}`, backgroundColor: `${C.card}e0`,
        boxShadow: `0 12px 50px rgba(0,0,0,0.5)`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Accent top border that shifts color */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${
            phaseOp[0] > 0.5 ? C.green : phaseOp[1] > 0.5 ? C.accent : C.cyan
          }40, transparent)`,
        }} />

        {/* Cumulative Revenue */}
        <div style={{ position: "absolute", inset: 20, opacity: phaseOp[0] }}>
          <CumulativeAreaChart frame={frame} />
        </div>

        {/* Per-Epoch Bars */}
        <div style={{ position: "absolute", inset: 20, opacity: phaseOp[1] }}>
          <EpochBarChart frame={Math.max(0, frame - PHASES[1].start)} />
        </div>

        {/* Holder Count */}
        <div style={{ position: "absolute", inset: 20, opacity: phaseOp[2] }}>
          <HolderAreaChart frame={Math.max(0, frame - PHASES[2].start)} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Shared: compute all points for a dataset ──

function computePoints(data: number[], maxVal: number) {
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  return data.map((v, i) => ({
    x: CHART_PAD.left + (i / (data.length - 1)) * plotW,
    y: CHART_PAD.top + plotH - (v / maxVal) * plotH,
  }));
}

function computePathLength(points: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// ── Shared: grid lines ──

const ChartGrid: React.FC<{ maxVal: number; gridOp: number; formatVal: (v: number) => string }> = ({ maxVal, gridOp, formatVal }) => {
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  return (
    <g opacity={gridOp}>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = CHART_PAD.top + (i / 4) * plotH;
        const val = maxVal - (i / 4) * maxVal;
        return (
          <g key={i}>
            <line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y} stroke={C.border} strokeWidth="0.5" strokeDasharray={i === 4 ? "0" : "4 4"} />
            <text x={CHART_PAD.left - 8} y={y + 4} textAnchor="end" fill={C.muted} fontSize="10" fontFamily="monospace">{formatVal(val)}</text>
          </g>
        );
      })}
      {MOCK_EPOCHS.map((e, i) => {
        const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
        return (
          <text key={i} x={CHART_PAD.left + (i / (MOCK_EPOCHS.length - 1)) * plotW} y={CHART_H - 8} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="monospace">#{e.epoch}</text>
        );
      })}
    </g>
  );
};

// ── Area chart: cumulative revenue (smooth strokeDasharray draw) ──

const CumulativeAreaChart: React.FC<{ frame: number }> = ({ frame }) => {
  const data = MOCK_EPOCHS.map((e) => e.cumulative);
  const maxVal = Math.max(...data);
  const points = computePoints(data, maxVal);
  const totalLength = computePathLength(points);

  // Smooth draw: line sweeps via dashoffset
  const drawProgress = interpolate(frame, [4, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dashOffset = totalLength * (1 - drawProgress);

  // Area fade follows slightly behind line
  const areaOp = interpolate(frame, [8, 26], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Grid fades in first
  const gridOp = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Points appear after line passes them
  const pointOpacity = (i: number) => {
    const pointTime = 4 + (i / (data.length - 1)) * 20;
    return interpolate(frame, [pointTime + 2, pointTime + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };

  // Value label fades in after fully drawn
  const labelOp = interpolate(frame, [24, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_PAD.top + plotH} L${points[0].x},${CHART_PAD.top + plotH} Z`;

  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.green} stopOpacity="0.3" />
          <stop offset="100%" stopColor={C.green} stopOpacity="0" />
        </linearGradient>
        {/* Clip that sweeps left-to-right for smooth area reveal */}
        <clipPath id="areaClip">
          <rect x={0} y={0} width={CHART_PAD.left + (CHART_W - CHART_PAD.left - CHART_PAD.right) * drawProgress + 2} height={CHART_H} />
        </clipPath>
      </defs>
      <ChartGrid maxVal={maxVal} gridOp={gridOp} formatVal={(v) => v.toFixed(1)} />
      {/* Area fill — clipped to draw progress */}
      <path d={areaPath} fill="url(#areaGrad)" opacity={areaOp} clipPath="url(#areaClip)" />
      {/* Line — strokeDasharray draw */}
      <path d={linePath} fill="none" stroke={C.green} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray={totalLength} strokeDashoffset={dashOffset} />
      {/* Points — appear sequentially */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={C.dark} stroke={C.green} strokeWidth="2" opacity={pointOpacity(i)} />
      ))}
      {/* Value label */}
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 12} textAnchor="middle" fill={C.green} fontSize="12" fontWeight="bold" fontFamily="monospace" opacity={labelOp}>
        {data[data.length - 1].toFixed(2)} SOL
      </text>
    </svg>
  );
};

// ── Bar chart: per-epoch revenue (spring-based growth) ──

const EpochBarChart: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const data = MOCK_EPOCHS.map((e) => e.amount);
  const maxVal = Math.max(...data) * 1.15;
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const barW = plotW / data.length * 0.55;
  const gap = plotW / data.length;

  const gridOp = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <ChartGrid maxVal={maxVal} gridOp={gridOp} formatVal={(v) => v.toFixed(1)} />
      {data.map((v, i) => {
        // Spring-based growth with stagger
        const delay = 4 + i * 2.5;
        const growProgress = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120, mass: 0.8 } });
        const barH = (v / maxVal) * plotH * growProgress;
        const x = CHART_PAD.left + i * gap + (gap - barW) / 2;
        const y = CHART_PAD.top + plotH - barH;

        // Value labels fade in after bar lands
        const valOp = interpolate(frame - delay, [8, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        // Glow on bar top
        const glowOp = growProgress > 0.9 ? interpolate(growProgress, [0.9, 1], [0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

        return (
          <g key={i}>
            {/* Bar glow */}
            {glowOp > 0 && (
              <rect x={x - 2} y={y - 2} width={barW + 4} height={barH + 4} rx="6" fill="none" stroke={C.accent} strokeWidth="1" opacity={glowOp} />
            )}
            <rect x={x} y={y} width={barW} height={Math.max(0, barH)} rx="4" fill="url(#barGrad)" />
            {/* X label */}
            <text x={x + barW / 2} y={CHART_H - 8} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="monospace">#{MOCK_EPOCHS[i].epoch}</text>
            {/* Value above bar */}
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill={C.accent} fontSize="9" fontWeight="bold" fontFamily="monospace" opacity={valOp}>
              +{v.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Area chart: holder count (smooth draw) ──

const HolderAreaChart: React.FC<{ frame: number }> = ({ frame }) => {
  const data = MOCK_EPOCHS.map((e) => e.holders);
  const maxVal = Math.max(...data) * 1.1;
  const points = computePoints(data, maxVal);
  const totalLength = computePathLength(points);

  const drawProgress = interpolate(frame, [4, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dashOffset = totalLength * (1 - drawProgress);
  const areaOp = interpolate(frame, [8, 26], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gridOp = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pointOpacity = (i: number) => {
    const pointTime = 4 + (i / (data.length - 1)) * 20;
    return interpolate(frame, [pointTime + 2, pointTime + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };

  const labelOp = interpolate(frame, [24, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_PAD.top + plotH} L${points[0].x},${CHART_PAD.top + plotH} Z`;

  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <defs>
        <linearGradient id="holderGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cyan} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
        </linearGradient>
        <clipPath id="holderClip">
          <rect x={0} y={0} width={CHART_PAD.left + (CHART_W - CHART_PAD.left - CHART_PAD.right) * drawProgress + 2} height={CHART_H} />
        </clipPath>
      </defs>
      <ChartGrid maxVal={maxVal} gridOp={gridOp} formatVal={(v) => String(Math.round(v))} />
      <path d={areaPath} fill="url(#holderGrad)" opacity={areaOp} clipPath="url(#holderClip)" />
      <path d={linePath} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray={totalLength} strokeDashoffset={dashOffset} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={C.dark} stroke={C.cyan} strokeWidth="2" opacity={pointOpacity(i)} />
      ))}
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 12} textAnchor="middle" fill={C.cyan} fontSize="12" fontWeight="bold" fontFamily="monospace" opacity={labelOp}>
        {data[data.length - 1]} holders
      </text>
    </svg>
  );
};

/* ═══════════════════ SCENE 4: LP ANALYTICS ═══════════════════ */

const BeatLpAnalytics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entrance
  const panelProgress = spring({ frame: frame - 3, fps, config: { damping: 10, stiffness: 140 } });
  const panelScale = interpolate(panelProgress, [0, 1], [0.85, 1]);
  const panelOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const lpCards = [
    { label: "Graduation", value: "Graduated", dot: C.green, sub: "Jan 14, 2:30 PM" },
    { label: "LP Status", value: "Deployed", dot: C.cyan, sub: "PumpSwap AMM" },
    { label: "Total Deposited", value: "4.82 SOL", dot: null, sub: "LP Tokens: 12,847" },
    { label: "Platform Fee", value: "5.0%", dot: null, sub: "0.62 SOL collected" },
    { label: "Holder / LP Split", value: "50% / 50%", dot: null, sub: "Locked at launch" },
    { label: "LP Cost Basis", value: "3.91 SOL", dot: null, sub: null },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Section label */}
      <div style={{
        opacity: interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 5,
        color: C.cyan, fontFamily: C.font, marginBottom: 20,
      }}>
        LP Analytics
      </div>

      <div style={{
        opacity: panelOp, transform: `scale(${panelScale})`,
        display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 14,
      }}>
        {lpCards.map((card, i) => {
          const delay = 8 + i * 5;
          const cardOp = interpolate(frame - delay, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const cardY = interpolate(frame - delay, [0, 5], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={card.label} style={{
              opacity: cardOp, transform: `translateY(${cardY}px)`,
              padding: "16px 18px", borderRadius: 16,
              backgroundColor: `${C.card}e0`,
              border: `1px solid ${C.border}`,
              boxShadow: `0 6px 24px rgba(0,0,0,0.3)`,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 2,
                color: C.muted, fontFamily: C.font, marginBottom: 8,
              }}>
                {card.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {card.dot && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", backgroundColor: card.dot,
                    boxShadow: `0 0 10px ${card.dot}80`,
                  }} />
                )}
                <span style={{
                  fontSize: 18, fontWeight: 800, color: C.white, fontFamily: C.mono,
                }}>
                  {card.value}
                </span>
              </div>
              {card.sub && (
                <div style={{
                  fontSize: 10, color: C.muted, fontFamily: C.font, marginTop: 4,
                }}>
                  {card.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 5: DISTRIBUTION TABLE ═══════════════════ */

const BeatTable: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel
  const panelOp = interpolate(frame, [3, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const visibleRows = [...MOCK_EPOCHS].reverse().slice(0, 5);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        opacity: panelOp,
        width: 880, borderRadius: 22, overflow: "hidden",
        border: `1px solid ${C.border}`, backgroundColor: `${C.card}e0`,
        boxShadow: `0 12px 50px rgba(0,0,0,0.5)`,
      }}>
        {/* Header bar */}
        <div style={{
          height: 1, background: `linear-gradient(90deg, transparent, ${C.green}40, transparent)`,
        }} />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: `1px solid ${C.border}50`,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 3,
            color: C.muted, fontFamily: C.font,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Distribution History
          </div>
          <span style={{
            fontSize: 9, fontWeight: 600, color: C.muted, fontFamily: C.font,
            padding: "3px 10px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)",
          }}>
            8 epochs
          </span>
        </div>

        {/* Column headers */}
        <div style={{
          display: "flex", padding: "8px 24px",
          fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 2,
          color: C.muted, fontFamily: C.font,
          borderBottom: `1px solid ${C.border}30`,
        }}>
          <span style={{ width: 70 }}>Epoch</span>
          <span style={{ width: 120 }}>Date</span>
          <span style={{ width: 140, textAlign: "right" as const }}>Amount</span>
          <span style={{ width: 160, textAlign: "right" as const }}>Cumulative</span>
          <span style={{ width: 100, textAlign: "right" as const }}>Holders</span>
          <span style={{ flex: 1, textAlign: "right" as const }}>TX</span>
        </div>

        {/* Rows */}
        {visibleRows.map((row, i) => {
          const delay = 6 + i * 4;
          const rowOp = interpolate(frame - delay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const rowX = interpolate(frame - delay, [0, 4], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={row.epoch} style={{
              opacity: rowOp, transform: `translateX(${rowX}px)`,
              display: "flex", alignItems: "center", padding: "10px 24px",
              fontSize: 12, fontFamily: C.font,
              borderBottom: `1px solid ${C.border}10`,
            }}>
              <span style={{ width: 70, fontWeight: 800, color: C.white, fontFamily: C.mono }}>#{row.epoch}</span>
              <span style={{ width: 120, color: C.muted }}>{row.date}</span>
              <span style={{ width: 140, textAlign: "right" as const, fontFamily: C.mono, fontWeight: 600, color: C.green }}>+{row.amount.toFixed(4)}</span>
              <span style={{ width: 160, textAlign: "right" as const, fontFamily: C.mono, color: C.white }}>{row.cumulative.toFixed(4)}</span>
              <span style={{ width: 100, textAlign: "right" as const, color: C.text }}>{row.holders}</span>
              <span style={{ flex: 1, textAlign: "right" as const, color: C.cyan, fontSize: 11 }}>View</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 6: CTA CLOSE ═══════════════════ */

const BeatClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo
  const logoProgress = spring({ frame: frame - 3, fps, config: { damping: 15, stiffness: 60 }, durationInFrames: 45 });
  const logoScale = interpolate(logoProgress, [0, 1], [0.6, 1]);
  const logoOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Brand
  const brandOp = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brandY = interpolate(frame, [12, 22], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagOp = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL
  const urlOp = interpolate(frame, [28, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow
  const glow = interpolate(frame, [3, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 400, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.green}15, transparent)`,
        opacity: glow,
      }} />

      {/* Logo */}
      <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 16 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 100, height: 100 }} />
      </div>

      {/* Brand */}
      <div style={{
        opacity: brandOp, transform: `translateY(${brandY}px)`,
        fontSize: 36, fontWeight: 800, color: C.white, fontFamily: C.font,
        letterSpacing: -1.5, marginBottom: 10,
      }}>
        Anvil<span style={{ color: C.green }}> Protocol</span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: tagOp, fontSize: 16, color: C.muted, fontFamily: C.font, marginBottom: 22,
      }}>
        Every SOL. Tracked. Transparent.
      </div>

      {/* URL badge */}
      <div style={{
        opacity: urlOp,
        padding: "10px 28px", borderRadius: 12,
        border: `1px solid ${C.green}30`, backgroundColor: `${C.green}08`,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.green, fontFamily: C.mono, letterSpacing: 1 }}>
          anvil-protocol.fun
        </span>
      </div>
    </AbsoluteFill>
  );
};
