import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { C } from "../colors";
import { AnimGrid, FloatingOrbs } from "../ig/shared";

/*
 * AI DUAL MODE — 140 frames (~4.7s)
 * Two floating app panels side by side: Onboarding vs Helper
 */

const QUICK_ACTIONS = [
  { label: "Launch a token", icon: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5" },
  { label: "Explore tokens", icon: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" },
  { label: "How does it work?", icon: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" },
];

const ONBOARD_REPLY = "Anvil shares creator fees with\ntoken holders automatically.";
const HELPER_REPLY = "You have 0.42 SOL claimable\nfrom this vault. Want to claim?";

export const AiDualModeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterScale = interpolate(frame, [0, 14], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [128, 140], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitBlur = interpolate(frame, [132, 140], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Panel entrances
  const leftProgress = spring({ frame: frame - 5, fps, config: { damping: 13, stiffness: 90 } });
  const leftX = interpolate(leftProgress, [0, 1], [-40, 0]);
  const leftOp = interpolate(frame, [5, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const rightProgress = spring({ frame: frame - 10, fps, config: { damping: 13, stiffness: 90 } });
  const rightX = interpolate(rightProgress, [0, 1], [40, 0]);
  const rightOp = interpolate(frame, [10, 21], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Interactions
  const clickGlow = interpolate(frame, [42, 44, 48], [0, 1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const onboardReplyOp = interpolate(frame, [50, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const onboardChars = Math.floor(interpolate(frame, [52, 82], [0, ONBOARD_REPLY.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const helperPrompt = "what can I claim?";
  const helperChars = Math.floor(interpolate(frame, [65, 85], [0, helperPrompt.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const helperMsgOp = interpolate(frame, [63, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const helperReplyOp = interpolate(frame, [95, 101], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const helperReplyChars = Math.floor(interpolate(frame, [97, 122], [0, HELPER_REPLY.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const dotPulse = 0.5 + Math.sin(frame * 0.15) * 0.5;
  const panelGlow = 0.3 + Math.sin(frame * 0.06) * 0.15;

  const PANEL: React.CSSProperties = {
    borderRadius: 24,
    border: `1px solid ${C.border}`,
    backgroundColor: `${C.card}e6`,
    backdropFilter: "blur(20px)",
    boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03), 0 0 ${40 * panelGlow}px ${C.green}06`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  // Shared mascot avatar
  const Avatar: React.FC<{ s?: number }> = ({ s = 30 }) => (
    <Img
      src={staticFile("anvil-mascot.png")}
      style={{
        width: s,
        height: s,
        borderRadius: s * 0.3,
        flexShrink: 0,
      }}
    />
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 45%, #100e1e 0%, ${C.dark} 60%), radial-gradient(ellipse at 70% 45%, #0a1218 0%, transparent 60%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 80, y: 250, size: 450, color: C.accent, speed: 0.01, phase: 0 },
          { x: 1500, y: 350, size: 420, color: C.cyan, speed: 0.013, phase: 3 },
          { x: 800, y: 100, size: 350, color: C.green, speed: 0.016, phase: 5 },
          { x: 400, y: 650, size: 300, color: C.pink, speed: 0.008, phase: 1.8 },
        ]}
      />

      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40 }}>
        {/* ═══ LEFT: ONBOARDING CHAT ═══ */}
        <div
          style={{
            opacity: leftOp,
            transform: `translateX(${leftX}px)`,
            width: 440,
            height: 560,
            ...PANEL,
          }}
        >
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.accent}4d, transparent)`, flexShrink: 0 }} />

          {/* Header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}cc`,
              backgroundColor: `${C.dark}b3`,
              backdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Img
                src={staticFile("anvil-mascot.png")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: C.font }}>Anvil AI</div>
                <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, fontFamily: C.font }}>Onboarding</div>
              </div>
            </div>
            <div style={{ padding: "4px 12px", borderRadius: 8, backgroundColor: `${C.accent}15`, border: `1px solid ${C.accent}25` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: C.font }}>LANDING PAGE</span>
            </div>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
            {/* Welcome */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Avatar />
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  borderTopLeftRadius: 4,
                  border: `1px solid ${C.border}`,
                  backgroundColor: `${C.dark}99`,
                  fontSize: 13,
                  color: C.text,
                  fontFamily: C.font,
                  lineHeight: 1.5,
                }}
              >
                hey, welcome to anvil.<br />what can I help with?
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 38 }}>
              {QUICK_ACTIONS.map((a, i) => {
                const btnOp = interpolate(frame, [20 + i * 5, 26 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const isClicked = i === 2 && frame >= 42;
                return (
                  <div
                    key={a.label}
                    style={{
                      opacity: btnOp,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
                      borderRadius: 10,
                      border: `1px solid ${isClicked ? C.accent + "50" : C.border}`,
                      backgroundColor: isClicked ? `${C.accent}15` : `${C.dark}80`,
                      boxShadow: isClicked ? `0 0 ${clickGlow * 20}px ${C.accent}20` : "none",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={isClicked ? C.white : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={a.icon} />
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isClicked ? C.white : C.muted, fontFamily: C.font }}>
                      {a.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            {frame >= 50 && (
              <div style={{ opacity: onboardReplyOp, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Avatar />
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    borderTopLeftRadius: 4,
                    border: `1px solid ${C.border}`,
                    backgroundColor: `${C.dark}99`,
                    fontSize: 13,
                    color: C.text,
                    fontFamily: C.font,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ONBOARD_REPLY.slice(0, onboardChars)}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}cc`, backgroundColor: `${C.dark}80`, flexShrink: 0 }}>
            <div style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark, fontSize: 12, color: `${C.muted}66`, fontFamily: C.font }}>
              Ask anything...
            </div>
          </div>
        </div>

        {/* ═══ CENTER DIVIDER ═══ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ width: 2, height: 50, background: `linear-gradient(transparent, ${C.border}, transparent)` }} />
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              backgroundColor: `${C.card}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3" />
            </svg>
          </div>
          <div style={{ width: 2, height: 50, background: `linear-gradient(transparent, ${C.border}, transparent)` }} />
        </div>

        {/* ═══ RIGHT: HELPER PANEL ═══ */}
        <div
          style={{
            opacity: rightOp,
            transform: `translateX(${rightX}px)`,
            width: 440,
            height: 560,
            ...PANEL,
          }}
        >
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan}4d, transparent)`, flexShrink: 0 }} />

          {/* Header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}cc`,
              backgroundColor: `${C.dark}b3`,
              backdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Img
                src={staticFile("anvil-mascot.png")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: C.font }}>Anvil AI</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: C.green, boxShadow: `0 0 ${4 + dotPulse * 4}px ${C.green}` }} />
                  <span style={{ fontSize: 10, color: C.green, fontFamily: C.font }}>online</span>
                </div>
              </div>
            </div>
            <div style={{ padding: "4px 12px", borderRadius: 8, backgroundColor: `${C.cyan}15`, border: `1px solid ${C.cyan}25` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, fontFamily: C.font }}>VAULT PAGE</span>
            </div>
          </div>

          {/* Context badge */}
          <div
            style={{
              margin: "12px 18px 0",
              padding: "9px 14px",
              borderRadius: 12,
              border: `1px solid ${C.cyan}20`,
              backgroundColor: `${C.cyan}08`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: interpolate(frame, [16, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: `${C.green}1a`,
                border: `1px solid ${C.green}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: C.green,
                fontFamily: C.font,
              }}
            >
              F
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: C.font }}>FORGE Vault</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>7xKp...anv1</div>
            </div>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
            {/* User message */}
            {frame >= 63 && (
              <div style={{ opacity: helperMsgOp, display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: 14,
                    borderBottomRightRadius: 4,
                    background: `linear-gradient(135deg, ${C.accent}, #5b21b6)`,
                    boxShadow: `0 4px 16px ${C.accent}30`,
                    fontSize: 13,
                    color: C.white,
                    fontFamily: C.mono,
                  }}
                >
                  {helperPrompt.slice(0, helperChars)}
                  {frame < 88 && <span style={{ opacity: Math.sin(frame * 0.4) > 0 ? 1 : 0 }}>|</span>}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {frame >= 88 && frame < 97 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Avatar />
                <div style={{ padding: "10px 14px", borderRadius: 14, borderTopLeftRadius: 4, border: `1px solid ${C.border}`, backgroundColor: `${C.dark}99`, display: "flex", gap: 5 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green, opacity: 0.3 + Math.sin(frame * 0.35 + i * 1.2) * 0.5 }} />
                  ))}
                </div>
              </div>
            )}

            {/* Reply */}
            {frame >= 95 && (
              <div style={{ opacity: helperReplyOp, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Avatar />
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    borderTopLeftRadius: 4,
                    border: `1px solid ${C.border}`,
                    backgroundColor: `${C.dark}99`,
                    fontSize: 13,
                    color: C.text,
                    fontFamily: C.font,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {HELPER_REPLY.slice(0, helperReplyChars)}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}cc`, backgroundColor: `${C.dark}80`, flexShrink: 0 }}>
            <div style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark, fontSize: 12, color: `${C.muted}66`, fontFamily: C.font }}>
              Ask about this vault...
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
