import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  staticFile,
} from "remotion";
import { C } from "./colors";
import { calcShake, FlashOverlay, SlamText, SlamScale, Background } from "./effects";
import { Cursor } from "./Cursor";
import { OpenerBeat } from "./scenes/OpenerBeat";

/*
 * ANVIL PROTOCOL — 30s Intro Video (Aggressive / Hype)
 *
 * 1280x720, 30fps, 900 frames
 *
 * ── BEAT MAP ──
 *
 * PHASE 1: CONVERSATION (0-335, 11.2s)
 *   DM bubbles + zoom punch-through
 *
 * BLACK GAP: (335-350, 0.5s)
 *   Dramatic pause — pure black
 *
 * PHASE 2: INTRODUCING (350-435, 2.8s)
 *   "INTRODUCING" slam → logo slam
 *
 * PHASE 3: PRODUCT BEATS (435-900, 15.5s)
 *   A: 435-500  (2.2s)  "Launch tokens. Reward the holders."
 *   B: 500-560  (2.0s)  Badge + stats
 *   C: 560-660  (3.3s)  Three steps rapid-fire
 *   D: 660-800  (4.7s)  Fee flow diagram
 *   E: 800-900  (3.3s)  CTA + Final
 */

// Shake triggers (at content "land" moment in each product beat)
const PRODUCT_SHAKES = [371, 403, 456, 821];
// Flash triggers (at beat boundaries)
const FLASH_TRIGGERS = [363, 398, 448, 813];

/* ═══════════════════ MAIN COMPOSITION ═══════════════════ */

export const AnvilIntro: React.FC = () => {
  const frame = useCurrentFrame();

  const shake = calcShake(frame, PRODUCT_SHAKES, 10, 14);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Audio src={staticFile("bgm.mp3")} volume={0.8} />

      {/* ── Phase 1: Conversation (no shake) ── */}
      <Sequence from={0} durationInFrames={348}>
        <OpenerBeat />
      </Sequence>

      {/* ── Black gap: 348-363 (dramatic pause) ── */}

      {/* ── Phase 2+3: Product content (with shake) ── */}
      {frame >= 363 && (
        <AbsoluteFill
          style={{
            transform: `translate(${shake.x}px, ${shake.y}px)`,
          }}
        >
          <Background />

          <Sequence from={363} durationInFrames={85}>
            <BeatIntroducing />
          </Sequence>

          <Sequence from={448} durationInFrames={65}>
            <BeatTagline />
          </Sequence>

          <Sequence from={513} durationInFrames={60}>
            <BeatBadge />
          </Sequence>

          <Sequence from={573} durationInFrames={100}>
            <BeatSteps />
          </Sequence>

          <Sequence from={673} durationInFrames={140}>
            <BeatFeeFlow />
          </Sequence>

          <Sequence from={813} durationInFrames={100}>
            <BeatFinal />
          </Sequence>
        </AbsoluteFill>
      )}

      {/* White flashes (above everything) */}
      <FlashOverlay frame={frame} triggers={FLASH_TRIGGERS} />
    </AbsoluteFill>
  );
};

/* ═══════════════════ INTRODUCING ═══════════════════ */

const BeatIntroducing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "INTRODUCING" slams at frame 5
  const introProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 7, stiffness: 200, mass: 0.7 },
  });
  const introScale = interpolate(introProgress, [0, 1], [3.5, 1]);
  const introOp = interpolate(frame, [5, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const introBlur = interpolate(frame, [5, 14], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo + brand slam at frame 35
  const logoProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [35, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [35, 44], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse behind logo
  const glowOp = interpolate(frame, [35, 60], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}20, transparent)`,
          opacity: glowOp,
        }}
      />

      {/* INTRODUCING */}
      <div
        style={{
          opacity: introOp,
          transform: `scale(${introScale})`,
          filter: `blur(${introBlur}px)`,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 18,
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: C.font,
          marginBottom: 12,
        }}
      >
        Introducing
      </div>

      {/* Logo + Brand */}
      <div
        style={{
          opacity: logoOp,
          transform: `scale(${logoScale})`,
          filter: `blur(${logoBlur}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Img
          src={staticFile("logo.svg")}
          style={{ width: 110, height: 110 }}
        />
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -2,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ TAGLINE (merged) ═══════════════════ */

const BeatTagline: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <SlamText delay={3} fontSize={76}>
        Launch tokens.
      </SlamText>
      <SlamText
        delay={12}
        fontSize={76}
        gradient={`linear-gradient(135deg, ${C.green}, ${C.cyan})`}
      >
        Reward the holders.
      </SlamText>
    </AbsoluteFill>
  );
};

/* ═══════════════════ BADGE + STATS ═══════════════════ */

const BeatBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulsing rings
  const ringScale1 = 1 + Math.sin(frame * 0.12) * 0.06;
  const ringScale2 = 1 + Math.sin(frame * 0.12 + 1.5) * 0.08;

  // "LIVE" slam
  const liveProgress = spring({ frame: frame - 3, fps, config: { damping: 8, stiffness: 200, mass: 0.7 } });
  const liveScale = interpolate(liveProgress, [0, 1], [3, 1]);
  const liveOp = interpolate(frame, [3, 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const liveBlur = interpolate(frame, [3, 10], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Solana Mainnet"
  const netOp = interpolate(frame, [14, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const netY = interpolate(frame, [14, 22], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = [
    { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "On-chain", sub: "Anchor program", color: C.green },
    { icon: "M9 11l3 3L22 4", title: "Verified", sub: "Merkle proofs", color: C.cyan },
    { icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2", title: "Non-custodial", sub: "Your keys", color: C.accent },
    { icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2", title: "Hourly", sub: "Auto payouts", color: C.pink },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Pulsing rings — positioned behind the LIVE text area */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -60%) scale(${ringScale1})`, width: 240, height: 240, borderRadius: "50%", border: `1px solid ${C.green}12`, boxShadow: `0 0 60px ${C.green}08, inset 0 0 60px ${C.green}05` }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -60%) scale(${ringScale2})`, width: 320, height: 320, borderRadius: "50%", border: `1px solid ${C.green}08` }} />

      {/* LIVE + SOLANA MAINNET */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 2 }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", backgroundColor: C.green,
          boxShadow: `0 0 20px ${C.green}, 0 0 50px ${C.green}60`,
          opacity: liveOp,
        }} />
        <div style={{
          opacity: liveOp, transform: `scale(${liveScale})`, filter: `blur(${liveBlur}px)`,
          fontSize: 52, fontWeight: 900, letterSpacing: 8, color: C.white, fontFamily: C.font,
        }}>
          LIVE
        </div>
        <div style={{
          opacity: netOp, transform: `translateY(${netY}px)`,
          fontSize: 16, fontWeight: 600, letterSpacing: 6, textTransform: "uppercase",
          fontFamily: C.font,
          background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Solana Mainnet
        </div>
      </div>

      {/* Feature cards — horizontal row below */}
      <div style={{ display: "flex", gap: 16, marginTop: 60, zIndex: 2 }}>
        {features.map((f, i) => {
          const delay = 22 + i * 5;
          const fProgress = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 160 } });
          const fScale = interpolate(fProgress, [0, 1], [1.8, 1]);
          const fOp = interpolate(frame - delay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fBlur = interpolate(frame - delay, [0, 5], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fY = interpolate(fProgress, [0, 1], [20, 0]);

          return (
            <div key={f.title} style={{
              opacity: fOp, filter: `blur(${fBlur}px)`,
              transform: `scale(${fScale}) translateY(${fY}px)`,
              width: 155, padding: "14px 16px", borderRadius: 16,
              backgroundColor: `${C.card}e0`,
              border: `1px solid ${f.color}20`,
              borderTop: `2px solid ${f.color}50`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${f.color}06`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: `${f.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: C.font }}>{f.title}</span>
              </div>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: C.font }}>{f.sub}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ THREE STEPS ═══════════════════ */

const stepsData = [
  { num: "01", title: "Launch your token", desc: "Create with one click", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8", color: C.green },
  { num: "02", title: "Fees accumulate", desc: "Every trade generates revenue", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", color: C.accent },
  { num: "03", title: "Holders get paid", desc: "Automatic hourly distributions", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z", color: C.cyan },
];

const BeatSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        opacity: headerOp, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: 6, color: C.accent, fontFamily: C.font, marginBottom: 32,
      }}>
        How it works
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
        {/* Animated vertical progress line */}
        {(() => {
          const lineH = interpolate(frame, [10, 85], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div style={{
              position: "absolute", left: 47, top: 28, width: 2, height: lineH, zIndex: 0,
              background: `linear-gradient(180deg, ${C.green}80, ${C.accent}80, ${C.cyan}80)`,
              boxShadow: `0 0 8px ${C.green}30`,
            }} />
          );
        })()}

        {stepsData.map((step, i) => {
          const delay = 8 + i * 25;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 160, mass: 0.8 } });
          const slideX = interpolate(progress, [0, 1], [80, 0]);
          const op = interpolate(frame - delay, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const blur = interpolate(frame - delay, [0, 6], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          // Active glow on the step number circle
          const glowIntensity = interpolate(frame, [delay + 5, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={step.num} style={{
              display: "flex", alignItems: "center", gap: 20, marginBottom: i < 2 ? 20 : 0,
              opacity: op, transform: `translateX(${slideX}px)`, filter: `blur(${blur}px)`,
              position: "relative", zIndex: 1,
            }}>
              {/* Step number circle */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                backgroundColor: `${step.color}18`,
                border: `2px solid ${step.color}${glowIntensity > 0.5 ? "80" : "30"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 ${20 * glowIntensity}px ${step.color}40`,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: step.color, fontFamily: C.mono }}>{step.num}</span>
              </div>

              {/* Content card */}
              <div style={{
                width: 500, padding: "18px 24px", borderRadius: 18,
                backgroundColor: `${C.card}e0`,
                border: `1px solid ${step.color}18`,
                borderLeft: `3px solid ${step.color}60`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 30px ${step.color}06`,
                display: "flex", alignItems: "center", gap: 18,
              }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: `${step.color}12`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={step.icon} />
                  </svg>
                </div>
                {/* Text */}
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 2 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>{step.desc}</div>
                </div>
                {/* Arrow / chevron */}
                <div style={{ marginLeft: "auto", opacity: 0.4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ FEE FLOW ═══════════════════ */

/** Cubic ease in-out for cursor segments */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Multi-waypoint interpolation with per-segment easing */
function cursorLerp(frame: number, kf: number[], vals: number[]): number {
  if (frame <= kf[0]) return vals[0];
  if (frame >= kf[kf.length - 1]) return vals[vals.length - 1];
  let i = 0;
  while (i < kf.length - 1 && kf[i + 1] < frame) i++;
  const t = ease((frame - kf[i]) / (kf[i + 1] - kf[i]));
  return vals[i] + (vals[i + 1] - vals[i]) * t;
}

// Layout constants for the slider bar (video coords 1920x1080)
// Panel is 536px wide centered at x=960, inner padding 28px each side → bar is 480px
const BAR_LEFT = 720;
const BAR_RIGHT = 1200;
const BAR_W = BAR_RIGHT - BAR_LEFT; // 480
const BAR_Y = 601;     // vertical center of the slider bar (centered layout, tip offset -3)

// Cursor path: frame → screen position
// Story: enter → grab at left → drag right to 85% → back to center (50%) → hold → exit
const CUR_FRAMES = [44,  55,  57,   76,   92,   118,  132];
const CUR_X =      [1500, BAR_LEFT + 6, BAR_LEFT, BAR_LEFT + BAR_W * 0.85, BAR_LEFT + BAR_W * 0.5, BAR_LEFT + BAR_W * 0.5, 1500];
const CUR_Y =      [850, BAR_Y,  BAR_Y, BAR_Y, BAR_Y, BAR_Y, 850];
const CUR_CLICK_FRAME = 57; // grab moment

const BeatFeeFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Flow nodes (Trade → Vault) ──
  const headerOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tradeProgress = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 160 } });
  const tradeS = interpolate(tradeProgress, [0, 1], [2.2, 1]);
  const tradeOp = interpolate(frame, [6, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowH = interpolate(frame, [16, 28], [0, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vaultProgress = spring({ frame: frame - 24, fps, config: { damping: 10, stiffness: 160 } });
  const vaultS = interpolate(vaultProgress, [0, 1], [2.2, 1]);
  const vaultOp = interpolate(frame, [24, 29], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrow2H = interpolate(frame, [30, 38], [0, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Panel ──
  const panelProgress = spring({ frame: frame - 36, fps, config: { damping: 12, stiffness: 120 } });
  const panelS = interpolate(panelProgress, [0, 1], [0.85, 1]);
  const panelOp = interpolate(frame, [36, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Platform fee ──
  const feeOp = interpolate(frame, [44, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feeBarW = interpolate(frame, [46, 56], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feePct = interpolate(frame, [46, 56], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Cursor position (drives slider) ──
  const curX = cursorLerp(frame, CUR_FRAMES, CUR_X);
  const curY = cursorLerp(frame, CUR_FRAMES, CUR_Y);

  // Derive slider value from cursor X position during drag phase
  const isDragging = frame >= CUR_CLICK_FRAME && frame <= 118;
  const rawSliderPos = isDragging
    ? Math.max(0, Math.min(100, ((curX - BAR_LEFT) / BAR_W) * 100))
    : interpolate(frame, [0, 56, 57, 118, 140], [0, 0, 0, 50, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Before drag, bars are empty. During & after, they follow cursor.
  const holderPct = rawSliderPos * 0.95;
  const lpPct = (100 - rawSliderPos) * 0.95;
  const thumbPos = rawSliderPos; // 0-100% of bar

  const thumbOp = interpolate(frame, [50, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Labels & presets ──
  const labelsOp = interpolate(frame, [92, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const presetOp = interpolate(frame, [98, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockOp = interpolate(frame, [108, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Active preset based on current position
  const presets = [
    { label: "All Holders", pos: 100 },
    { label: "75 / 25", pos: 75 },
    { label: "50 / 50", pos: 50 },
    { label: "25 / 75", pos: 25 },
    { label: "All LP", pos: 0 },
  ];
  const activePreset = presets.reduce((best, p) =>
    Math.abs(p.pos - rawSliderPos) < Math.abs(best.pos - rawSliderPos) ? p : best
  ).label;

  // ── Cursor visual state ──
  const cursorOp = interpolate(frame, [CUR_FRAMES[0], CUR_FRAMES[0] + 8, CUR_FRAMES[CUR_FRAMES.length - 2], CUR_FRAMES[CUR_FRAMES.length - 1]], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clickRel = frame - CUR_CLICK_FRAME;
  const showClickRipple = clickRel >= 0 && clickRel < 16;
  const clickProgress = showClickRipple ? clickRel / 16 : 0;

  // Pressed state: cursor slightly smaller during drag
  const cursorScale = isDragging ? 0.9 : 1;

  const SLIDER_W = 480;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        opacity: headerOp, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: 6, color: C.green, fontFamily: C.font,
      }}>
        Fee Economics
      </div>

      {/* Flow: Trade → Vault */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 12 }}>
        <div style={{
          transform: `scale(${tradeS})`, opacity: tradeOp,
          padding: "7px 20px", borderRadius: 12,
          border: `1px solid ${C.border}`, backgroundColor: C.card,
          fontSize: 13, fontWeight: 600, color: C.white, fontFamily: C.font,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
          </svg>
          Every Trade
        </div>
        <div style={{ width: 2, height: arrowH, background: `linear-gradient(${C.green}80, ${C.green}40)`, margin: "1px 0" }} />
        <div style={{
          transform: `scale(${vaultS})`, opacity: vaultOp,
          padding: "7px 20px", borderRadius: 12,
          border: `1px solid ${C.green}30`, backgroundColor: `${C.green}0a`,
          fontSize: 13, fontWeight: 700, color: C.green, fontFamily: C.font,
          boxShadow: `0 4px 20px rgba(0,255,136,0.06)`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Anvil Vault
        </div>
        <div style={{ width: 2, height: arrow2H, background: `linear-gradient(${C.green}40, ${C.accent}40)`, margin: "1px 0" }} />
      </div>

      {/* ── Slider Panel ── */}
      <div style={{
        opacity: panelOp, transform: `scale(${panelS})`,
        width: SLIDER_W + 56, padding: "20px 28px", borderRadius: 22,
        border: `1px solid ${C.borderLight}`, backgroundColor: C.card,
        boxShadow: `0 12px 50px rgba(0,0,0,0.5), 0 0 40px ${C.green}05`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: C.muted, fontFamily: C.font }}>
            Fee Distribution
          </span>
          <span style={{ opacity: lockOp, display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: `${C.muted}90`, fontFamily: C.font }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Locked at launch
          </span>
        </div>

        {/* Platform fee bar */}
        <div style={{ opacity: feeOp, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.pink, fontFamily: C.font, fontWeight: 600 }}>Platform Fee</span>
            <span style={{ fontSize: 10, color: C.pink, fontFamily: C.mono, fontWeight: 700 }}>{feePct.toFixed(0)}%</span>
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: `${C.pink}12`, overflow: "hidden" }}>
            <div style={{ width: `${feeBarW}%`, height: "100%", borderRadius: 3, backgroundColor: `${C.pink}90`, boxShadow: `0 0 10px ${C.pink}30` }} />
          </div>
        </div>

        {/* Main split bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{
            width: "100%", height: 14, borderRadius: 7,
            backgroundColor: C.dark,
            display: "flex", overflow: "visible",
            position: "relative",
          }}>
            {/* Holders (green) — grows from left */}
            <div style={{
              width: `${Math.min(holderPct, 95)}%`, height: "100%",
              backgroundColor: C.green,
              borderRadius: holderPct >= 94 ? "7px" : "7px 0 0 7px",
              boxShadow: holderPct > 1 ? `0 0 12px ${C.green}40` : "none",
            }} />
            {/* LP (cyan) — grows from right */}
            <div style={{
              width: `${Math.min(lpPct, 95)}%`, height: "100%",
              backgroundColor: C.cyan,
              borderRadius: lpPct >= 94 ? "7px" : "0 7px 7px 0",
              marginLeft: "auto",
              boxShadow: lpPct > 1 ? `0 0 12px ${C.cyan}40` : "none",
            }} />
            {/* Thumb */}
            <div style={{
              position: "absolute", top: "50%", left: `${thumbPos}%`,
              transform: "translate(-50%, -50%)",
              width: 20, height: 20, borderRadius: "50%",
              backgroundColor: C.white,
              border: `2px solid ${C.dark}`,
              boxShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 ${isDragging ? 18 : 8}px ${C.green}${isDragging ? "50" : "20"}`,
              opacity: thumbOp,
              transition: "box-shadow 0.1s",
            }} />
          </div>
        </div>

        {/* Labels row */}
        <div style={{ display: "flex", justifyContent: "space-between", opacity: labelsOp, marginBottom: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.green }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.font }}>
              Holders: {holderPct.toFixed(1)}%
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.cyan }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>
              LP: {lpPct.toFixed(1)}%
            </span>
          </span>
        </div>

        {/* Preset pills (dynamically highlight nearest) */}
        <div style={{ display: "flex", gap: 7, opacity: presetOp }}>
          {presets.map((p) => {
            const isActive = p.label === activePreset;
            return (
              <div key={p.label} style={{
                padding: "5px 12px", borderRadius: 8,
                fontSize: 10, fontWeight: 600, fontFamily: C.font,
                backgroundColor: isActive ? `${C.green}18` : `rgba(255,255,255,0.04)`,
                color: isActive ? C.green : C.muted,
                border: isActive ? `1px solid ${C.green}25` : "1px solid transparent",
                boxShadow: isActive ? `0 0 10px ${C.green}10` : "none",
              }}>
                {p.label}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ opacity: lockOp, marginTop: 10, fontSize: 9, color: `${C.muted}80`, fontFamily: C.font, lineHeight: 1.4 }}>
          5% platform fee deducted first. Remaining fees split between holder distributions and PumpSwap LP.
        </div>
      </div>

      {/* ── Inline cursor (synced with slider) ── */}
      {cursorOp > 0 && (
        <div style={{
          position: "absolute", left: curX, top: curY,
          opacity: cursorOp, zIndex: 100, pointerEvents: "none",
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
          transform: `scale(${cursorScale})`,
          transformOrigin: "top left",
        }}>
          {/* Click ripple */}
          {showClickRipple && (
            <div style={{
              position: "absolute", left: 2, top: 2,
              width: 30 + clickProgress * 40, height: 30 + clickProgress * 40,
              borderRadius: "50%",
              border: `2px solid rgba(0, 255, 136, ${0.8 * (1 - clickProgress)})`,
              transform: "translate(-50%, -50%)",
              backgroundColor: `rgba(0, 255, 136, ${0.12 * (1 - clickProgress)})`,
            }} />
          )}
          {/* Cursor pointer SVG */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 3L22 14L14 16L10 24L6 3Z" fill="white" stroke="#06060b" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ═══════════════════ CTA + FINAL ═══════════════════ */

const BeatFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: CTA button (0-45)
  const btnProgress = spring({ frame: frame - 3, fps, config: { damping: 9, stiffness: 180 } });
  const btnScale = interpolate(btnProgress, [0, 1], [2.5, 1]);
  const btnOp = interpolate(frame, [3, 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Click at frame 30
  const clickGlow = interpolate(frame, [30, 35, 45], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 1 fade out
  const phase1Op = interpolate(frame, [42, 48], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 2: Final reveal (50+)
  const finalOp = interpolate(frame, [50, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const finalLogoProgress = spring({ frame: frame - 50, fps, config: { damping: 18, stiffness: 50 }, durationInFrames: 50 });
  const finalLogoS = interpolate(finalLogoProgress, [0, 1], [0.6, 1]);

  const brandOp = interpolate(frame, [62, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brandY = interpolate(frame, [62, 75], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagOp = interpolate(frame, [75, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [83, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Dramatic glow
  const glow = interpolate(frame, [50, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Dramatic glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}15, transparent)`,
          opacity: glow,
        }}
      />

      {/* Phase 1: CTA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          opacity: phase1Op,
        }}
      >
        <div style={{ fontSize: 14, color: C.muted, fontFamily: C.font, opacity: interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          Create your token with built-in revenue sharing
        </div>
        <div
          style={{
            opacity: btnOp,
            transform: `scale(${btnScale})`,
            padding: "16px 52px",
            borderRadius: 16,
            backgroundColor: C.green,
            color: C.dark,
            fontSize: 22,
            fontWeight: 800,
            fontFamily: C.font,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: `0 0 ${25 + clickGlow * 50}px rgba(0,255,136,${0.15 + clickGlow * 0.4})`,
          }}
        >
          Launch Token
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        <Cursor
          waypoints={[
            { frame: 12, x: 1250, y: 720 },
            { frame: 25, x: 965, y: 555 },
            { frame: 30, x: 958, y: 552, click: true },
          ]}
        />
      </div>

      {/* Phase 2: Final */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: finalOp,
        }}
      >
        <div style={{ transform: `scale(${finalLogoS})`, marginBottom: 16 }}>
          <Img src={staticFile("logo.svg")} style={{ width: 110, height: 110 }} />
        </div>
        <div
          style={{
            opacity: brandOp,
            transform: `translateY(${brandY}px)`,
            fontSize: 38,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1.5,
            marginBottom: 10,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>
        <div style={{ opacity: tagOp, fontSize: 17, color: C.muted, fontFamily: C.font, marginBottom: 24 }}>
          Launch tokens. Reward the holders.
        </div>
        <div
          style={{
            opacity: urlOp,
            padding: "10px 28px",
            borderRadius: 12,
            border: `1px solid ${C.green}30`,
            backgroundColor: `${C.green}08`,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: C.green, fontFamily: C.mono, letterSpacing: 1 }}>
            anvil-protocol.fun
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
