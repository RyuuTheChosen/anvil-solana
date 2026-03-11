import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { AnimGrid, FloatingOrbs, shimmerStyle } from "../ig/shared";

/*
 * AI FEATURE GRID — 100 frames (~3.3s)
 * Title slam → 6 feature cards inside a floating panel
 */

const FEATURES = [
  { label: "Balance & History", desc: "Check SOL + token holdings", icon: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5", color: C.green },
  { label: "Explore Vaults", desc: "Search tokens and vaults", icon: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35", color: C.cyan },
  { label: "Claim Rewards", desc: "Single or batch claims", icon: "M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 2v13M5 9l7 7 7-7", color: C.green },
  { label: "Launch Tokens", desc: "Guided launch wizard", icon: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5", color: C.accent },
  { label: "Transfer SOL", desc: "Send tokens with validation", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", color: C.pink },
  { label: "Learn Concepts", desc: "Vaults, proofs, scoring", icon: "M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z", color: C.cyan },
];

export const AiFeatureGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterBlur = interpolate(frame, [0, 10], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterScale = interpolate(frame, [0, 12], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [88, 100], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitBlur = interpolate(frame, [92, 100], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Title
  const titleProgress = spring({ frame: frame - 3, fps, config: { damping: 9, stiffness: 150, mass: 0.7 } });
  const titleScale = interpolate(titleProgress, [0, 1], [2, 1]);
  const titleOp = interpolate(frame - 3, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleBlur = interpolate(frame - 3, [0, 8], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 35%, #0e0c1a 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 150, y: 150, size: 450, color: C.green, speed: 0.015, phase: 0 },
          { x: 1450, y: 450, size: 420, color: C.accent, speed: 0.012, phase: 2.5 },
          { x: 750, y: 700, size: 380, color: C.cyan, speed: 0.018, phase: 5 },
          { x: 1100, y: 150, size: 300, color: C.pink, speed: 0.01, phase: 4 },
        ]}
      />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 200,
          right: 200,
          bottom: 60,
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          backgroundColor: `${C.card}e6`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 50px",
        }}
      >
        {/* Gradient top edge */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.green}4d, transparent)` }} />

        {/* Title */}
        <div
          style={{
            opacity: titleOp,
            transform: `scale(${titleScale})`,
            filter: `blur(${titleBlur}px)`,
            fontSize: 46,
            fontWeight: 800,
            fontFamily: C.font,
            letterSpacing: -2,
            marginBottom: 44,
            textAlign: "center",
            textShadow: `0 2px 30px rgba(0,0,0,0.5)`,
          }}
        >
          <span style={{ color: C.white }}>Not a chatbot. </span>
          <span
            style={{
              background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            A platform assistant.
          </span>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, width: "100%" }}>
          {FEATURES.map((feat, i) => {
            const delay = 12 + i * 5;
            const cardProgress = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 170, mass: 0.7 } });
            const cardScale = interpolate(cardProgress, [0, 1], [1.6, 1]);
            const cardOp = interpolate(frame - delay, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardBlur = interpolate(frame - delay, [0, 6], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={feat.label}
                style={{
                  opacity: cardOp,
                  transform: `scale(${cardScale})`,
                  filter: `blur(${cardBlur}px)`,
                  padding: "20px 18px",
                  borderRadius: 16,
                  border: `1px solid ${feat.color}18`,
                  backgroundColor: `${C.dark}99`,
                  boxShadow: `inset 0 0 0 1px ${feat.color}0a`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: `${feat.color}12`,
                    border: `1px solid ${feat.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 2px 10px ${feat.color}08`,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={feat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={feat.icon} />
                  </svg>
                </div>

                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 4 }}>
                    {feat.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: C.font, lineHeight: 1.4 }}>
                    {feat.desc}
                  </div>
                </div>

                {(() => { const s = shimmerStyle(frame, delay + 6, 20); return s ? <div style={s} /> : null; })()}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
