import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { AnimGrid, FloatingOrbs } from "../ig/shared";

/*
 * AI ACTION — 160 frames (~5.3s)
 * Floating TX preview panel: Preview → Auto-sign → Signing → Confirming → Success
 */

type TxState = "preview" | "signing" | "confirming" | "success";

function getState(frame: number): TxState {
  if (frame < 55) return "preview";
  if (frame < 75) return "signing";
  if (frame < 105) return "confirming";
  return "success";
}

const DETAIL_ROWS = [
  { label: "Action", value: "Claim from 3 vaults", icon: "M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 2v13M5 9l7 7 7-7", valueColor: C.white },
  { label: "Amount", value: "0.67 SOL", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", valueColor: C.green },
  { label: "Network Fee", value: "~0.000005 SOL", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8", valueColor: C.muted },
];

export const AiActionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const state = getState(frame);

  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterScale = interpolate(frame, [0, 14], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [148, 160], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitBlur = interpolate(frame, [152, 160], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Card entrance
  const cardProgress = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 90 } });
  const cardY = interpolate(cardProgress, [0, 1], [50, 0]);
  const cardOp = interpolate(frame, [5, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Countdown
  const countdownProgress = interpolate(frame, [20, 53], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Success
  const successProgress = spring({ frame: frame - 108, fps, config: { damping: 8, stiffness: 180, mass: 0.8 } });
  const successScale = interpolate(successProgress, [0, 1], [2.5, 1]);
  const successOp = interpolate(frame - 108, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const successBlur = interpolate(frame - 108, [0, 8], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ring1 = frame >= 105 ? interpolate(frame, [105, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const ring2 = frame >= 112 ? interpolate(frame, [112, 152], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const badgeColor = state === "success" ? C.green : state === "preview" ? C.accent : C.cyan;

  const confetti = Array.from({ length: 24 }, (_, i) => ({
    x: 960 + Math.sin(i * 2.1 + 0.5) * 350,
    y: 420 - i * 12,
    speed: 2.2 + (i % 4) * 0.8,
    color: [C.green, C.cyan, C.accent, C.pink, C.white][i % 5],
    size: 4 + (i % 3) * 2,
    drift: Math.sin(i * 1.7) * 1.8,
    rotation: i * 37,
  }));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #0b0d16 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 350, y: 250, size: 500, color: C.green, speed: 0.01, phase: 0.5 },
          { x: 1250, y: 450, size: 450, color: C.accent, speed: 0.014, phase: 3.5 },
          { x: 960, y: 800, size: 380, color: C.cyan, speed: 0.009, phase: 2 },
        ]}
      />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 620,
          right: 620,
          bottom: 160,
          borderRadius: 24,
          border: `1px solid ${state === "success" ? `${C.green}25` : C.border}`,
          backgroundColor: `${C.card}e6`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03)${state === "success" ? `, 0 0 80px ${C.green}08` : ""}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: cardOp,
          transform: `translateY(${cardY}px)`,
        }}
      >
        {/* Top gradient */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${badgeColor}4d, transparent)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.border}cc`, backgroundColor: `${C.dark}b3`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${C.green}15`, border: `1px solid ${C.green}25`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 10px ${C.green}10` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.white, fontFamily: C.font }}>Claim Rewards</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font }}>Transaction Preview</div>
            </div>
          </div>
          <div style={{ padding: "5px 14px", borderRadius: 8, backgroundColor: `${badgeColor}15`, border: `1px solid ${badgeColor}25` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1 }}>
              {state === "preview" ? "Preview" : state === "signing" ? "Signing" : state === "confirming" ? "Confirming" : "Complete"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "20px 28px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Detail rows */}
          {DETAIL_ROWS.map((row, i) => {
            const rowOp = interpolate(frame, [12 + i * 5, 18 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={row.label}
                style={{
                  opacity: rowOp,
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${C.border}60`,
                  backgroundColor: `${C.dark}80`,
                  marginBottom: 8,
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${row.valueColor}0c`, border: `1px solid ${row.valueColor}15`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={row.valueColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={row.icon} /></svg>
                </div>
                <span style={{ fontSize: 14, color: C.muted, fontFamily: C.font, flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: row.valueColor, fontFamily: C.mono, textShadow: row.valueColor === C.green ? `0 0 10px ${C.green}25` : "none" }}>{row.value}</span>
              </div>
            );
          })}

          {/* Auto-sign countdown */}
          {state === "preview" && frame >= 18 && (
            <div style={{ marginTop: 14, padding: "14px 18px", borderRadius: 14, border: `1px solid ${C.green}12`, backgroundColor: `${C.green}06`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke={`${C.green}15`} strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={C.green} strokeWidth="3" strokeDasharray={`${countdownProgress * 94.2} 94.2`} strokeLinecap="round" transform="rotate(-90 18 18)" style={{ filter: `drop-shadow(0 0 4px ${C.green}40)` }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: C.mono }}>{Math.max(0, Math.ceil((53 - frame) / 30))}s</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.green, fontFamily: C.font }}>Auto-signing...</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font }}>Embedded wallet — no popups</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: `${C.dark}99`, fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: C.font }}>Cancel</div>
            </div>
          )}

          {/* Signing / Confirming */}
          {(state === "signing" || state === "confirming") && (
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "16px 0" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2.5px solid ${C.cyan}20`, borderTop: `2.5px solid ${C.cyan}`, transform: `rotate(${frame * 12}deg)`, boxShadow: `0 0 12px ${C.cyan}15` }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>{state === "signing" ? "Signing transaction..." : "Confirming on Solana..."}</span>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, justifyContent: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 60 + ring1 * 80, height: 60 + ring1 * 80, borderRadius: "50%", border: `1.5px solid ${C.green}${Math.round((1 - ring1) * 40).toString(16).padStart(2, "0")}`, transform: "translate(-50%, -50%)" }} />
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 60 + ring2 * 120, height: 60 + ring2 * 120, borderRadius: "50%", border: `1px solid ${C.green}${Math.round((1 - ring2) * 25).toString(16).padStart(2, "0")}`, transform: "translate(-50%, -50%)" }} />
                <div style={{ opacity: successOp, transform: `scale(${successScale})`, filter: `blur(${successBlur}px)`, width: 64, height: 64, borderRadius: 16, backgroundColor: `${C.green}1a`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${C.green}20, 0 0 80px ${C.green}08`, position: "relative" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: C.font, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: interpolate(frame, [116, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                0.67 SOL claimed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confetti */}
      {state === "success" && confetti.map((p, i) => {
        const cOp = interpolate(frame, [108, 114, 140, 155], [0, 1, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: p.x + Math.sin((frame - 108) * 0.1 + i) * 35 + (frame - 108) * p.drift, top: p.y + (frame - 108) * p.speed, width: p.size, height: p.size * 0.6, borderRadius: 1, backgroundColor: p.color, opacity: cOp * 0.7, transform: `rotate(${frame * 4 + p.rotation}deg)`, pointerEvents: "none" }} />
        );
      })}
    </AbsoluteFill>
  );
};
