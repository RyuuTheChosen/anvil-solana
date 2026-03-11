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
import { calcShake, SlamText, SlamScale, Background } from "../effects";

/*
 * FEE DISTRIBUTION — 16s composition (480 frames @ 30fps)
 *
 * Scene 1: BeatLaunchForm   (0-150, 5s)   — Creator configures & launches
 * Scene 2: BeatFeesAccumulate (150-270, 4s) — Fees flow in
 * Scene 3: BeatClaimFlow    (270-420, 5s)  — Holder claims rewards
 * Scene 4: BeatCTA          (420-480, 2s)  — Branding close
 */

const SHAKE_TRIGGERS = [5, 155, 278, 370];

/* ── Helpers ── */

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cursorLerp(frame: number, kf: number[], vals: number[]): number {
  if (frame <= kf[0]) return vals[0];
  if (frame >= kf[kf.length - 1]) return vals[vals.length - 1];
  let i = 0;
  while (i < kf.length - 1 && kf[i + 1] < frame) i++;
  const t = ease((frame - kf[i]) / (kf[i + 1] - kf[i]));
  return vals[i] + (vals[i + 1] - vals[i]) * t;
}

/** Inline cursor with click ripple */
const InlineCursor: React.FC<{
  frame: number;
  kfFrames: number[];
  kfX: number[];
  kfY: number[];
  clickFrame?: number;
  isDragging?: boolean;
}> = ({ frame, kfFrames, kfX, kfY, clickFrame, isDragging }) => {
  const curX = cursorLerp(frame, kfFrames, kfX);
  const curY = cursorLerp(frame, kfFrames, kfY);
  const cursorOp = interpolate(
    frame,
    [kfFrames[0], kfFrames[0] + 8, kfFrames[kfFrames.length - 2], kfFrames[kfFrames.length - 1]],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  if (cursorOp <= 0) return null;

  const clickRel = clickFrame != null ? frame - clickFrame : -1;
  const showRipple = clickRel >= 0 && clickRel < 16;
  const rippleP = showRipple ? clickRel / 16 : 0;

  return (
    <div style={{
      position: "absolute", left: curX, top: curY,
      opacity: cursorOp, zIndex: 100, pointerEvents: "none",
      filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
      transform: `scale(${isDragging ? 0.9 : 1})`, transformOrigin: "top left",
    }}>
      {showRipple && (
        <div style={{
          position: "absolute", left: 2, top: 2,
          width: 30 + rippleP * 40, height: 30 + rippleP * 40,
          borderRadius: "50%",
          border: `2px solid rgba(0,255,136,${0.8 * (1 - rippleP)})`,
          transform: "translate(-50%, -50%)",
          backgroundColor: `rgba(0,255,136,${0.12 * (1 - rippleP)})`,
        }} />
      )}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M6 3L22 14L14 16L10 24L6 3Z" fill="white" stroke="#06060b" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/*
 * ===============================================
 *  SCENE 1: BeatLaunchForm (150 frames / 5s)
 *  Creator configures token name, symbol, fee split, launches
 * ===============================================
 */

// Slider layout
const PANEL_W = 560;
const SLIDER_W = 490;
const SLIDER_LEFT = (1920 - SLIDER_W) / 2;
const SLIDER_Y = 565;

// Cursor path for slider drag
const S1_GRAB = 68;
const S1_CUR_FRAMES = [55, 65, 68, 88, 100, 100, 115, 122, 132];
const S1_CUR_X = [
  1500,
  SLIDER_LEFT + SLIDER_W * 0.5 + 6,
  SLIDER_LEFT + SLIDER_W * 0.5,
  SLIDER_LEFT + SLIDER_W * 0.85,
  SLIDER_LEFT + SLIDER_W * 0.75,
  SLIDER_LEFT + SLIDER_W * 0.75,
  // Move down to Launch button
  960,
  960,
  1500,
];
const S1_CUR_Y = [
  700,
  SLIDER_Y,
  SLIDER_Y,
  SLIDER_Y,
  SLIDER_Y,
  SLIDER_Y,
  685,
  685,
  700,
];
const S1_CLICK_BTN = 122;

const BeatLaunchForm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title slam
  const titleProgress = spring({ frame: frame - 3, fps, config: { damping: 8, stiffness: 180, mass: 0.8 } });
  const titleScale = interpolate(titleProgress, [0, 1], [2.8, 1]);
  const titleOp = interpolate(frame, [3, 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleBlur = interpolate(frame, [3, 10], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Form card spring
  const cardProgress = spring({ frame: frame - 14, fps, config: { damping: 12, stiffness: 100 } });
  const cardS = interpolate(cardProgress, [0, 1], [0.88, 1]);
  const cardOp = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Typing animations
  const tokenName = "ANVIL TEST";
  const symbol = "AVTEST";
  const typing1 = interpolate(frame, [22, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const typing2 = interpolate(frame, [32, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const name1Chars = Math.floor(typing1 * tokenName.length);
  const sym1Chars = Math.floor(typing2 * symbol.length);

  // Fee slider
  const sliderOp = interpolate(frame, [48, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor drives slider
  const curX = cursorLerp(frame, S1_CUR_FRAMES, S1_CUR_X);
  const isDragging = frame >= S1_GRAB && frame <= 100;
  const rawSliderPos = isDragging
    ? Math.max(0, Math.min(100, ((curX - SLIDER_LEFT) / SLIDER_W) * 100))
    : frame < S1_GRAB ? 50 : 75;
  const holderPct = rawSliderPos * 0.95;
  const lpPct = (100 - rawSliderPos) * 0.95;
  const thumbPos = rawSliderPos;
  const thumbOp = interpolate(frame, [54, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Presets
  const presetOp = interpolate(frame, [60, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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

  // Platform fee bar
  const feeOp = interpolate(frame, [52, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feeBarW = interpolate(frame, [54, 62], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Lock icon
  const lockOp = interpolate(frame, [70, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Max holders
  const holdersOp = interpolate(frame, [78, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Launch button
  const btnProgress = spring({ frame: frame - 105, fps, config: { damping: 10, stiffness: 140 } });
  const btnS = interpolate(btnProgress, [0, 1], [1.8, 1]);
  const btnOp = interpolate(frame, [105, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnClickGlow = interpolate(frame, [122, 128, 140], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [138, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <Background />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {/* Title slam */}
        <div style={{
          opacity: titleOp,
          transform: `scale(${titleScale})`,
          filter: `blur(${titleBlur}px)`,
          fontSize: 42, fontWeight: 800, color: C.white, fontFamily: C.font,
          letterSpacing: -2, marginBottom: 24, display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 36 }}>&#128640;</span>
          Launch Your <span style={{ color: C.green }}>Token</span>
        </div>

        {/* Form card */}
        <div style={{
          opacity: cardOp, transform: `scale(${cardS})`,
          width: PANEL_W, padding: "24px 28px", borderRadius: 22,
          border: `1px solid ${C.borderLight}`, backgroundColor: C.card,
          boxShadow: `0 16px 60px rgba(0,0,0,0.5), 0 0 50px ${C.green}06`,
        }}>
          {/* Token Name + Symbol fields */}
          <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Token Name
              </div>
              <div style={{
                padding: "9px 12px", borderRadius: 10,
                border: `1px solid ${C.borderLight}`, backgroundColor: C.dark,
                fontSize: 14, fontWeight: 500, color: C.white, fontFamily: C.font, minHeight: 20,
              }}>
                {tokenName.substring(0, name1Chars)}
                {typing1 > 0 && typing1 < 1 && <span style={{ color: C.green, fontWeight: 300 }}>|</span>}
              </div>
            </div>
            <div style={{ width: 140 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Symbol
              </div>
              <div style={{
                padding: "9px 12px", borderRadius: 10,
                border: `1px solid ${C.borderLight}`, backgroundColor: C.dark,
                fontSize: 14, fontWeight: 500, color: C.white, fontFamily: C.font, minHeight: 20,
              }}>
                {symbol.substring(0, sym1Chars)}
                {typing2 > 0 && typing2 < 1 && <span style={{ color: C.green, fontWeight: 300 }}>|</span>}
              </div>
            </div>
          </div>

          {/* Fee Distribution section */}
          <div style={{ opacity: sliderOp }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
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
            <div style={{ opacity: feeOp, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: C.pink, fontFamily: C.font, fontWeight: 600 }}>Platform Fee</span>
                <span style={{ fontSize: 10, color: C.pink, fontFamily: C.mono, fontWeight: 700 }}>{feeBarW.toFixed(0)}%</span>
              </div>
              <div style={{ width: "100%", height: 5, borderRadius: 3, backgroundColor: `${C.pink}12`, overflow: "hidden" }}>
                <div style={{ width: `${feeBarW}%`, height: "100%", borderRadius: 3, backgroundColor: `${C.pink}90`, boxShadow: `0 0 10px ${C.pink}30` }} />
              </div>
            </div>

            {/* Main split bar */}
            <div style={{ marginBottom: 5 }}>
              <div style={{
                width: "100%", height: 12, borderRadius: 6,
                backgroundColor: C.dark,
                display: "flex", overflow: "visible", position: "relative",
              }}>
                <div style={{
                  width: `${Math.min(holderPct, 95)}%`, height: "100%",
                  backgroundColor: C.green,
                  borderRadius: holderPct >= 94 ? "6px" : "6px 0 0 6px",
                  boxShadow: holderPct > 1 ? `0 0 12px ${C.green}40` : "none",
                }} />
                <div style={{
                  width: `${Math.min(lpPct, 95)}%`, height: "100%",
                  backgroundColor: C.cyan,
                  borderRadius: lpPct >= 94 ? "6px" : "0 6px 6px 0",
                  marginLeft: "auto",
                  boxShadow: lpPct > 1 ? `0 0 12px ${C.cyan}40` : "none",
                }} />
                <div style={{
                  position: "absolute", top: "50%", left: `${thumbPos}%`,
                  transform: "translate(-50%, -50%)",
                  width: 18, height: 18, borderRadius: "50%",
                  backgroundColor: C.white, border: `2px solid ${C.dark}`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 ${isDragging ? 18 : 8}px ${C.green}${isDragging ? "50" : "20"}`,
                  opacity: thumbOp,
                }} />
              </div>
            </div>

            {/* Labels */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: presetOp }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: C.green, fontFamily: C.font }}>
                  Holders: {holderPct.toFixed(1)}%
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.cyan }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>
                  LP: {lpPct.toFixed(1)}%
                </span>
              </span>
            </div>

            {/* Preset pills */}
            <div style={{ display: "flex", gap: 6, opacity: presetOp, marginBottom: 10 }}>
              {presets.map((p) => {
                const isActive = p.label === activePreset;
                return (
                  <div key={p.label} style={{
                    padding: "4px 10px", borderRadius: 7,
                    fontSize: 9, fontWeight: 600, fontFamily: C.font,
                    backgroundColor: isActive ? `${C.green}18` : "rgba(255,255,255,0.04)",
                    color: isActive ? C.green : C.muted,
                    border: isActive ? `1px solid ${C.green}25` : "1px solid transparent",
                  }}>
                    {p.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Max Holders */}
          <div style={{ opacity: holdersOp, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1 }}>
              Max Holders
            </span>
            <div style={{
              padding: "4px 14px", borderRadius: 8,
              backgroundColor: `${C.accent}15`, border: `1px solid ${C.accent}25`,
              fontSize: 14, fontWeight: 800, color: C.accent, fontFamily: C.mono,
            }}>
              100
            </div>
          </div>

          {/* Launch button */}
          <div style={{
            opacity: btnOp, transform: `scale(${btnS})`,
            padding: "12px 0", borderRadius: 14, textAlign: "center",
            backgroundColor: C.green, color: C.dark,
            fontSize: 16, fontWeight: 700, fontFamily: C.font,
            boxShadow: `0 0 ${20 + btnClickGlow * 50}px rgba(0,255,136,${0.12 + btnClickGlow * 0.4})`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            Launch Token
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>

      {/* Cursor */}
      <InlineCursor
        frame={frame}
        kfFrames={S1_CUR_FRAMES}
        kfX={S1_CUR_X}
        kfY={S1_CUR_Y}
        clickFrame={S1_CLICK_BTN}
        isDragging={isDragging}
      />
    </AbsoluteFill>
  );
};

/*
 * ===============================================
 *  SCENE 2: BeatFeesAccumulate (120 frames / 4s)
 *  Fees flow in, SOL counter counts up
 * ===============================================
 */

const BeatFeesAccumulate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Every Trade" node slam
  const tradeProgress = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 160 } });
  const tradeS = interpolate(tradeProgress, [0, 1], [2.2, 1]);
  const tradeOp = interpolate(frame, [5, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Arrow
  const arrowH = interpolate(frame, [14, 26], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Anvil Vault" node slam
  const vaultProgress = spring({ frame: frame - 22, fps, config: { damping: 10, stiffness: 160 } });
  const vaultS = interpolate(vaultProgress, [0, 1], [2.2, 1]);
  const vaultOp = interpolate(frame, [22, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // SOL counter
  const solTarget = 47.283;
  const solVal = interpolate(frame, [30, 90], [0, solTarget], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const counterOp = interpolate(frame, [28, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fee split bars
  const barOp = interpolate(frame, [50, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const platformW = interpolate(frame, [55, 70], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const holderW = interpolate(frame, [60, 80], [0, 71.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lpW = interpolate(frame, [65, 85], [0, 23.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slam text
  const slamOp = interpolate(frame, [88, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Flow nodes */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Every Trade */}
        <div style={{
          transform: `scale(${tradeS})`, opacity: tradeOp,
          padding: "10px 28px", borderRadius: 14,
          border: `1px solid ${C.border}`, backgroundColor: C.card,
          fontSize: 15, fontWeight: 600, color: C.white, fontFamily: C.font,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
          </svg>
          Every Trade
        </div>

        {/* Arrow */}
        <div style={{ width: 2, height: arrowH, background: `linear-gradient(${C.green}80, ${C.green}40)`, margin: "2px 0" }} />

        {/* Anvil Vault */}
        <div style={{
          transform: `scale(${vaultS})`, opacity: vaultOp,
          padding: "10px 28px", borderRadius: 14,
          border: `1px solid ${C.green}30`, backgroundColor: `${C.green}0a`,
          fontSize: 15, fontWeight: 700, color: C.green, fontFamily: C.font,
          boxShadow: `0 4px 20px rgba(0,255,136,0.06)`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          Anvil Vault
        </div>
      </div>

      {/* Big SOL counter */}
      <div style={{
        opacity: counterOp, marginTop: 28,
        fontSize: 64, fontWeight: 900, fontFamily: C.mono, color: C.white,
        letterSpacing: -3, lineHeight: 1,
        textShadow: `0 0 40px ${C.green}30`,
      }}>
        {solVal.toFixed(3)}
        <span style={{ fontSize: 22, fontWeight: 600, color: C.muted, fontFamily: C.font, letterSpacing: 0, marginLeft: 12 }}>
          SOL
        </span>
      </div>

      {/* Fee split breakdown */}
      <div style={{ opacity: barOp, width: 480, marginTop: 24 }}>
        {/* Platform */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.pink, fontFamily: C.font }}>Platform</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.pink, fontFamily: C.mono }}>{platformW.toFixed(0)}%</span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, backgroundColor: `${C.pink}12` }}>
            <div style={{ width: `${platformW}%`, height: "100%", borderRadius: 4, backgroundColor: `${C.pink}80`, boxShadow: `0 0 10px ${C.pink}25` }} />
          </div>
        </div>
        {/* Holders */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.font }}>Holders</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: C.mono }}>{holderW.toFixed(1)}%</span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, backgroundColor: `${C.green}12` }}>
            <div style={{ width: `${holderW}%`, height: "100%", borderRadius: 4, backgroundColor: `${C.green}80`, boxShadow: `0 0 10px ${C.green}25` }} />
          </div>
        </div>
        {/* LP */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>LP Pool</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, fontFamily: C.mono }}>{lpW.toFixed(1)}%</span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, backgroundColor: `${C.cyan}12` }}>
            <div style={{ width: `${lpW}%`, height: "100%", borderRadius: 4, backgroundColor: `${C.cyan}80`, boxShadow: `0 0 10px ${C.cyan}25` }} />
          </div>
        </div>
      </div>

      {/* Slam text */}
      <div style={{ marginTop: 32, opacity: slamOp }}>
        <SlamText delay={88} fontSize={44} gradient={`linear-gradient(90deg, ${C.green}, ${C.cyan})`}>
          YOUR HOLDERS GET PAID
        </SlamText>
      </div>
    </AbsoluteFill>
  );
};

/*
 * ===============================================
 *  SCENE 3: BeatClaimFlow (150 frames / 5s)
 *  Full vault dashboard UI recreation + claim interaction
 * ===============================================
 */

const MOCK_HOLDERS = [
  { rank: 1, addr: "7xKp...R2mD", sol: "12.847", score: 98.2 },
  { rank: 2, addr: "3Fnw...vQ8e", sol: "9.331", score: 94.7 },
  { rank: 3, addr: "9Btx...kL4a", sol: "8.102", score: 91.3 },
  { rank: 4, addr: "2Wqm...pN7f", sol: "7.189", score: 87.1 },
  { rank: 5, addr: "6Jdv...tH2c", sol: "5.963", score: 82.6 },
];
const RANK_COLORS = [C.green, C.green, C.green, C.cyan, C.cyan];

const BeatClaimFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const PAGE_W = 1100;
  const SIDEBAR_W = 300;

  // Breadcrumb
  const breadOp = interpolate(frame, [3, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Header card
  const headerProgress = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 120 } });
  const headerS = interpolate(headerProgress, [0, 1], [0.92, 1]);
  const headerOp = interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Stat boxes
  const statIcons = [
    "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8z",
    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  ];
  const statColors = [C.green, C.white, C.white, C.cyan];
  const statLabels = ["Total Allocated", "Merkle Updates", "Holders", "Your Claimable"];

  const claimableTarget = 2.847;
  const claimCountUp = interpolate(frame, [30, 50], [0, claimableTarget], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const claimSuccess = frame >= 118;
  const claimCountDown = claimSuccess
    ? interpolate(frame, [118, 132], [claimableTarget, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : claimCountUp;
  const statValues = ["47.283 SOL", "142", "256", `${claimCountDown.toFixed(3)} SOL`];

  // Claim card
  const claimCardOp = interpolate(frame, [50, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const claimCardY = interpolate(frame, [50, 62], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor + click
  const CLAIM_CLICK = 95;
  const claimCurFrames = [72, 88, 95, 95, 130];
  const claimCurX = [1550, 1410, 1410, 1410, 1550];
  const claimCurY = [650, 415, 415, 415, 650];
  const clickGlow = interpolate(frame, [95, 100, 110], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const isClaiming = frame >= 100 && frame < 118;
  const spinnerAngle = (frame - 100) * 15;

  // Success banner
  const successOp = interpolate(frame, [118, 126], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const successProgress = spring({ frame: frame - 118, fps, config: { damping: 12, stiffness: 140 } });
  const successS = interpolate(successProgress, [0, 1], [1.3, 1]);

  // Sidebar panels
  const sideOp = interpolate(frame, [35, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sideY = interpolate(frame, [35, 48], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paramsOp = interpolate(frame, [42, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paramsY = interpolate(frame, [42, 55], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const recentOp = interpolate(frame, [50, 63], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const recentY = interpolate(frame, [50, 63], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Leaderboard
  const boardOp = interpolate(frame, [38, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const boardY = interpolate(frame, [38, 50], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardStyle: React.CSSProperties = {
    borderRadius: 18, border: `1px solid ${C.border}`, backgroundColor: C.card,
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden",
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2,
    color: C.muted, fontFamily: C.font, marginBottom: 12,
  };

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: PAGE_W }}>

        {/* Breadcrumb */}
        <div style={{
          opacity: breadOp, display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, color: C.muted, fontFamily: C.font, marginBottom: 14,
        }}>
          <span>Explore</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={{ color: C.white }}>ANVIL TEST</span>
        </div>

        {/* Header Card */}
        <div style={{
          opacity: headerOp, transform: `scale(${headerS})`, transformOrigin: "top center",
          ...cardStyle, marginBottom: 16,
        }}>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.green}40, transparent)` }} />
          <div style={{ padding: "18px 22px" }}>
            {/* Token identity row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  position: "relative", width: 48, height: 48, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.green}20, ${C.accent}10)`,
                  border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 700, color: C.white, fontFamily: C.font,
                }}>
                  A
                  <div style={{
                    position: "absolute", bottom: -3, right: -3,
                    width: 16, height: 16, borderRadius: "50%",
                    backgroundColor: C.green, border: `2px solid ${C.card}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: C.font }}>ANVIL TEST</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>$AVTEST · 7xKp...R2mD</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  padding: "4px 10px", borderRadius: 7,
                  backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                  fontSize: 9, fontWeight: 600, color: C.text, fontFamily: C.font,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Analytics
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 7,
                  backgroundColor: `${C.green}08`, border: `1px solid ${C.green}18`,
                  fontSize: 9, fontWeight: 700, color: C.green, fontFamily: C.font,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: C.green }} />
                  Active
                </div>
              </div>
            </div>

            {/* 4 stat boxes */}
            <div style={{ display: "flex", gap: 12 }}>
              {statLabels.map((label, i) => {
                const delay = 16 + i * 6;
                const op = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const y = interpolate(frame, [delay, delay + 10], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const isClaimable = i === 3;
                return (
                  <div key={label} style={{
                    flex: 1, opacity: op, transform: `translateY(${y}px)`,
                    padding: "12px 14px", borderRadius: 12,
                    backgroundColor: `${C.dark}80`, border: `1px solid ${C.border}60`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={`${C.muted}60`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={statIcons[i]} />
                      </svg>
                      <span style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: C.muted, fontFamily: C.font }}>
                        {label}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 800, fontFamily: C.mono, letterSpacing: -0.5,
                      color: isClaimable && claimSuccess ? C.muted : statColors[i],
                      textShadow: isClaimable && !claimSuccess ? `0 0 12px ${C.cyan}30` : "none",
                    }}>
                      {statValues[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Claim Card */}
        <div style={{
          opacity: claimCardOp, transform: `translateY(${claimCardY}px)`,
          ...cardStyle, marginBottom: 16,
        }}>
          {frame >= 50 && claimCountDown > 0.001 && (
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan}35, transparent)` }} />
          )}
          <div style={{ padding: "16px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: C.font }}>Claim Your SOL</span>
                </div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: C.font }}>
                  Total earned: <span style={{ color: C.white }}>2.847 SOL</span> · Already claimed: <span style={{ color: C.white }}>0.000 SOL</span>
                </div>
              </div>
              {!claimSuccess ? (
                <div style={{
                  padding: "8px 28px", borderRadius: 10,
                  backgroundColor: isClaiming ? `${C.green}20` : C.green,
                  color: isClaiming ? C.green : C.dark,
                  fontSize: 12, fontWeight: 700, fontFamily: C.font,
                  boxShadow: `0 0 ${12 + clickGlow * 30}px rgba(0,255,136,${0.08 + clickGlow * 0.3})`,
                  display: "flex", alignItems: "center", gap: 8,
                  border: isClaiming ? `1px solid ${C.green}30` : "1px solid transparent",
                }}>
                  {isClaiming ? (
                    <>
                      <div style={{
                        width: 13, height: 13, borderRadius: "50%",
                        border: `2px solid ${C.green}`, borderTopColor: "transparent",
                        transform: `rotate(${spinnerAngle}deg)`,
                      }} />
                      Claiming...
                    </>
                  ) : (
                    `Claim ${claimableTarget.toFixed(3)} SOL`
                  )}
                </div>
              ) : (
                <div style={{
                  opacity: successOp, transform: `scale(${successS})`,
                  padding: "8px 20px", borderRadius: 10,
                  backgroundColor: `${C.green}10`, border: `1px solid ${C.green}25`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: C.font }}>Claimed successfully!</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.cyan, fontFamily: C.font, textDecoration: "underline", textUnderlineOffset: 2 }}>
                    View TX
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body: Sidebar + Leaderboard */}
        <div style={{ display: "flex", gap: 16 }}>

          {/* Sidebar */}
          <div style={{ width: SIDEBAR_W, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>

            {/* Fee Split */}
            <div style={{ opacity: sideOp, transform: `translateY(${sideY}px)`, ...cardStyle, padding: "16px 18px" }}>
              <div style={sectionTitleStyle}>Fee Split</div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: C.dark, marginBottom: 12 }}>
                <div style={{ width: "5%", height: "100%", backgroundColor: `${C.muted}40` }} />
                <div style={{ width: "71.25%", height: "100%", backgroundColor: C.green }} />
                <div style={{ width: "23.75%", height: "100%", backgroundColor: C.cyan }} />
              </div>
              {[
                { label: "Platform", color: `${C.muted}40`, textColor: C.muted, pct: "5.0%" },
                { label: "Holders", color: C.green, textColor: C.green, pct: "71.3%" },
                { label: "LP", color: C.cyan, textColor: C.cyan, pct: "23.8%" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: row.textColor, fontFamily: C.font }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: row.color }} />
                    {row.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.white, fontFamily: C.font }}>{row.pct}</span>
                </div>
              ))}
            </div>

            {/* Vault Parameters */}
            <div style={{ opacity: paramsOp, transform: `translateY(${paramsY}px)`, ...cardStyle, padding: "16px 18px" }}>
              <div style={sectionTitleStyle}>Vault Parameters</div>
              {[
                { label: "Cycle Interval", value: "1 hour" },
                { label: "Max Holders", value: "256" },
                { label: "Dust Threshold", value: "0.01 SOL" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: C.font }}>{row.label}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 5,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    fontSize: 10, fontWeight: 600, color: C.white, fontFamily: C.font,
                  }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Recent Distributions */}
            <div style={{ opacity: recentOp, transform: `translateY(${recentY}px)`, ...cardStyle, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...sectionTitleStyle }}>
                <span>Recent Distributions</span>
                <span style={{ fontSize: 8, color: C.accent, fontFamily: C.font, fontWeight: 500, letterSpacing: 0, textTransform: "none" }}>View all</span>
              </div>
              {[
                { epoch: 142, date: "Mar 7", amount: "+0.3341" },
                { epoch: 141, date: "Mar 7", amount: "+0.2918" },
                { epoch: 140, date: "Mar 6", amount: "+0.4102" },
              ].map((e) => (
                <div key={e.epoch} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", borderRadius: 8,
                  backgroundColor: `${C.dark}60`, marginBottom: 4,
                }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: C.white, fontFamily: C.mono }}>#{e.epoch}</span>
                    <span style={{ fontSize: 8, color: C.muted, fontFamily: C.font, marginLeft: 6 }}>{e.date}</span>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: C.green, fontFamily: C.mono }}>{e.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ flex: 1, opacity: boardOp, transform: `translateY(${boardY}px)`, ...cardStyle }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 18px", borderBottom: `1px solid ${C.border}60`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: C.muted, fontFamily: C.font }}>
                  Top Holders
                </span>
              </div>
              <span style={{
                padding: "3px 8px", borderRadius: 5,
                backgroundColor: "rgba(255,255,255,0.04)",
                fontSize: 8, fontWeight: 600, color: C.muted, fontFamily: C.font,
              }}>5 / 256</span>
            </div>

            <div style={{ padding: "8px 14px" }}>
              <div style={{
                display: "flex", alignItems: "center", padding: "5px 8px", marginBottom: 2,
                fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5,
                color: C.muted, fontFamily: C.font,
              }}>
                <span style={{ width: 32 }}>#</span>
                <span style={{ flex: 1 }}>Wallet</span>
                <span style={{ width: 90, textAlign: "right" }}>Cumulative</span>
                <span style={{ width: 55, textAlign: "right" }}>Score</span>
              </div>

              {MOCK_HOLDERS.map((h, i) => {
                const rowDelay = 44 + i * 6;
                const rowOp = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const rowX = interpolate(frame, [rowDelay, rowDelay + 10], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const color = RANK_COLORS[i];
                const isTop3 = i < 3;
                const isYou = i === 2;
                return (
                  <div key={h.rank} style={{
                    opacity: rowOp, transform: `translateX(${rowX}px)`,
                    display: "flex", alignItems: "center",
                    padding: "8px 8px", borderRadius: 10,
                    backgroundColor: isYou ? `${C.green}08` : "transparent",
                    border: isYou ? `1px solid ${C.green}12` : "1px solid transparent",
                    marginBottom: 2,
                  }}>
                    <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isTop3 ? (
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 900, color, fontFamily: C.mono,
                        }}>{h.rank}</div>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: C.mono }}>{h.rank}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: C.mono }}>{h.addr}</span>
                      {isYou && (
                        <span style={{
                          padding: "1px 5px", borderRadius: 4,
                          backgroundColor: `${C.green}12`, fontSize: 7, fontWeight: 800,
                          color: C.green, fontFamily: C.font,
                        }}>YOU</span>
                      )}
                    </div>
                    <span style={{ width: 90, textAlign: "right", fontSize: 10, fontWeight: 600, color: C.text, fontFamily: C.mono }}>
                      {h.sol} SOL
                    </span>
                    <span style={{ width: 55, textAlign: "right", fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: C.mono }}>
                      {h.score.toFixed(0)}
                    </span>
                  </div>
                );
              })}

              <div style={{
                opacity: interpolate(frame, [78, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                textAlign: "center", padding: "8px 0 4px", fontSize: 10, color: C.muted, fontFamily: C.font,
              }}>
                <span style={{ color: C.green, fontWeight: 600 }}>+251</span> more holders earning rewards
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor */}
      <InlineCursor
        frame={frame}
        kfFrames={claimCurFrames}
        kfX={claimCurX}
        kfY={claimCurY}
        clickFrame={CLAIM_CLICK}
      />
    </AbsoluteFill>
  );
};

/*
 * ===============================================
 *  SCENE 4: BeatCTA (60 frames / 2s)
 *  Logo + brand + tagline + URL
 * ===============================================
 */

const BeatCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 50 }, durationInFrames: 50 });
  const logoS = interpolate(logoProgress, [0, 1], [0.6, 1]);
  const logoOp = interpolate(frame, [5, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const brandOp = interpolate(frame, [16, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brandY = interpolate(frame, [16, 28], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagOp = interpolate(frame, [28, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [38, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const glow = interpolate(frame, [5, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 400, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.green}18, transparent)`, opacity: glow,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoS})`, marginBottom: 16 }}>
          <Img src={staticFile("logo.svg")} style={{ width: 110, height: 110 }} />
        </div>
        <div style={{
          opacity: brandOp, transform: `translateY(${brandY}px)`,
          fontSize: 38, fontWeight: 800, color: C.white,
          fontFamily: C.font, letterSpacing: -1.5, marginBottom: 10,
        }}>
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>
        <div style={{ opacity: tagOp, fontSize: 17, color: C.muted, fontFamily: C.font, marginBottom: 24 }}>
          Launch tokens. Reward the holders.
        </div>
        <div style={{
          opacity: urlOp, padding: "10px 28px", borderRadius: 12,
          border: `1px solid ${C.green}30`, backgroundColor: `${C.green}08`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.green, fontFamily: C.mono, letterSpacing: 1 }}>
            anvil-protocol.fun
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/*
 * ===============================================
 *  MAIN COMPOSITION
 *  Scene 1: 0-150  (BeatLaunchForm — own Background, outside shake)
 *  Scene 2: 150-270 (BeatFeesAccumulate — shared Background, shake)
 *  Scene 3: 270-420 (BeatClaimFlow — shared Background, shake)
 *  Scene 4: 420-480 (BeatCTA — shared Background, shake)
 * ===============================================
 */

export const FeeDistribution: React.FC = () => {
  const frame = useCurrentFrame();

  const shake = calcShake(frame, SHAKE_TRIGGERS, 10, 14);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      {/* Scene 1: Launch form (smooth, no shake, own Background) */}
      <Sequence from={0} durationInFrames={150}>
        <BeatLaunchForm />
      </Sequence>

      {/* Scenes 2-4: Aggressive phase (shake wrapper + shared Background) */}
      {frame >= 150 && (
        <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
          <Background />

          <Sequence from={150} durationInFrames={120}>
            <BeatFeesAccumulate />
          </Sequence>

          <Sequence from={270} durationInFrames={150}>
            <BeatClaimFlow />
          </Sequence>

          <Sequence from={420} durationInFrames={60}>
            <BeatCTA />
          </Sequence>
        </AbsoluteFill>
      )}

    </AbsoluteFill>
  );
};
