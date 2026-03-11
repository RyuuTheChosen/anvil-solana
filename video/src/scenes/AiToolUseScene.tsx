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
import { AnimGrid, FloatingOrbs, shimmerStyle } from "../ig/shared";

/*
 * AI TOOL USE — 170 frames (~5.7s)
 * Floating chat panel: user asks → tool cards overlay → results stream in
 */

const TOOLS = [
  { name: "check_user_claims", icon: "M9 12l2 2 4-4M22 12a10 10 0 11-20 0 10 10 0 0120 0z", color: C.green },
  { name: "get_vault_details", icon: "M3 12h18M3 6h18M3 18h18", color: C.cyan },
  { name: "get_vault_details", icon: "M3 12h18M3 6h18M3 18h18", color: C.cyan },
  { name: "get_vault_details", icon: "M3 12h18M3 6h18M3 18h18", color: C.cyan },
];

const VAULTS = [
  { name: "FORGE", symbol: "F", amount: "0.42", pct: 63, color: C.green },
  { name: "APEX", symbol: "A", amount: "0.18", pct: 27, color: C.cyan },
  { name: "DRIFT", symbol: "D", amount: "0.07", pct: 10, color: C.accent },
];

export const AiToolUseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterScale = interpolate(frame, [0, 14], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [158, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitBlur = interpolate(frame, [162, 170], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const msgOp = interpolate(frame, [6, 11], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotsOp = interpolate(frame, [16, 19, 30, 34], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toolsVisible = frame >= 32 && frame < 88;
  const mergeProgress = interpolate(frame, [72, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const responseProgress = spring({ frame: frame - 88, fps, config: { damping: 12, stiffness: 100 } });
  const responseOp = interpolate(frame, [88, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const responseScale = interpolate(responseProgress, [0, 1], [0.92, 1]);

  const claimBtnOp = interpolate(frame, [135, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const claimPulse = frame >= 145 ? 0.7 + Math.sin(frame * 0.15) * 0.3 : 0;

  const dotPulse = 0.5 + Math.sin(frame * 0.15) * 0.5;
  const panelGlow = 0.3 + Math.sin(frame * 0.06) * 0.15;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #0c0e18 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 250, y: 150, size: 450, color: C.green, speed: 0.012, phase: 1 },
          { x: 1250, y: 600, size: 480, color: C.cyan, speed: 0.01, phase: 3 },
          { x: 800, y: 750, size: 350, color: C.accent, speed: 0.008, phase: 5 },
        ]}
      />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 480,
          right: 480,
          bottom: 120,
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          backgroundColor: `${C.card}e6`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03), 0 0 ${40 * panelGlow}px ${C.green}06`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.green}4d, transparent)`, flexShrink: 0 }} />

        {/* Header */}
        <div
          style={{
            padding: "14px 24px",
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
            <Img src={staticFile("anvil-mascot.png")} style={{ width: 32, height: 32, borderRadius: 10 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: C.font }}>Anvil AI</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: C.green, boxShadow: `0 0 ${4 + dotPulse * 4}px ${C.green}` }} />
                <span style={{ fontSize: 10, color: C.green, fontFamily: C.font }}>online</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ padding: "4px 12px", borderRadius: 8, backgroundColor: `${C.green}10`, border: `1px solid ${C.green}20` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.green, fontFamily: C.font }}>22 TOOLS</span>
            </div>
          </div>
        </div>

        {/* Chat body */}
        <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {/* User message */}
          <div style={{ opacity: msgOp, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ padding: "12px 18px", borderRadius: 16, borderBottomRightRadius: 4, background: `linear-gradient(135deg, ${C.accent}, #5b21b6)`, boxShadow: `0 4px 20px ${C.accent}35`, fontSize: 15, fontWeight: 500, color: C.white, fontFamily: C.font }}>
              do I have any rewards?
            </div>
          </div>

          {/* Thinking dots */}
          {dotsOp > 0 && (
            <div style={{ opacity: dotsOp, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Img src={staticFile("anvil-mascot.png")} style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0 }} />
              <div style={{ padding: "10px 16px", borderRadius: 14, borderTopLeftRadius: 4, border: `1px solid ${C.border}`, backgroundColor: `${C.dark}99`, display: "flex", gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.green, opacity: 0.3 + Math.sin(frame * 0.35 + i * 1.2) * 0.5, boxShadow: `0 0 6px ${C.green}30` }} />
                ))}
              </div>
            </div>
          )}

          {/* Tool cards overlay */}
          {toolsVisible && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, height: 50, paddingLeft: 38 }}>
              {TOOLS.map((tool, i) => {
                const toolDelay = 34 + i * 6;
                const toolProgress = spring({ frame: frame - toolDelay, fps, config: { damping: 12, stiffness: 140 } });
                const toolOp = interpolate(frame - toolDelay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const toolScale = interpolate(toolProgress, [0, 1], [0.4, 1]);
                const mergeX = interpolate(mergeProgress, [0, 1], [0, ((TOOLS.length - 1) * 80 / 2 - i * 80) * 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const mergeOp = interpolate(mergeProgress, [0.5, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                const spinStart = toolDelay + 8;
                const spinning = frame >= spinStart && frame < spinStart + 14;
                const checkFrame = spinStart + 14;
                const checkProgress = spring({ frame: frame - checkFrame, fps, config: { damping: 10, stiffness: 200 } });
                const checkOp = interpolate(frame - checkFrame, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                return (
                  <div
                    key={i}
                    style={{
                      opacity: toolOp * mergeOp,
                      transform: `scale(${toolScale}) translateX(${mergeX}px)`,
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid ${tool.color}20`,
                      backgroundColor: `${tool.color}08`,
                      boxShadow: `0 2px 12px ${tool.color}08`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      height: 38,
                    }}
                  >
                    {spinning ? (
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${tool.color}25`, borderTop: `2px solid ${tool.color}`, transform: `rotate(${frame * 14}deg)` }} />
                    ) : checkOp > 0 ? (
                      <div style={{ opacity: checkOp, transform: `scale(${interpolate(checkProgress, [0, 1], [1.5, 1])})` }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tool.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tool.icon} /></svg>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, color: tool.color, fontFamily: C.mono, whiteSpace: "nowrap" }}>
                      {tool.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Response card */}
          {frame >= 88 && (
            <div style={{ opacity: responseOp, transform: `scale(${responseScale})`, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Img src={staticFile("anvil-mascot.png")} style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0 }} />
              <div
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderTopLeftRadius: 4,
                  border: `1px solid ${C.border}`,
                  backgroundColor: `${C.dark}cc`,
                  padding: "16px 18px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: C.font, marginBottom: 12 }}>
                  Found claimable rewards in <span style={{ color: C.green }}>3 vaults</span>:
                </div>

                {VAULTS.map((v, i) => {
                  const rowDelay = 95 + i * 6;
                  const rowProgress = spring({ frame: frame - rowDelay, fps, config: { damping: 14, stiffness: 140 } });
                  const rowOp = interpolate(frame - rowDelay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const rowX = interpolate(rowProgress, [0, 1], [14, 0]);
                  const barFill = interpolate(frame, [rowDelay + 2, rowDelay + 14], [0, v.pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                  return (
                    <div key={v.name} style={{ opacity: rowOp, transform: `translateX(${rowX}px)`, padding: "10px 12px", borderRadius: 10, border: `1px solid ${v.color}12`, backgroundColor: `${v.color}06`, marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: `${v.color}1a`, border: `1px solid ${v.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: v.color, fontFamily: C.font }}>{v.symbol}</div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: C.font }}>{v.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: v.color, fontFamily: C.mono, textShadow: `0 0 8px ${v.color}25` }}>{v.amount} SOL</span>
                      </div>
                      <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: `${v.color}10`, overflow: "hidden" }}>
                        <div style={{ width: `${barFill}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${v.color}60, ${v.color})`, boxShadow: `0 0 6px ${v.color}25` }} />
                      </div>
                    </div>
                  );
                })}

                {/* Total */}
                <div style={{ opacity: interpolate(frame, [118, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: C.font }}>Total Claimable</span>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: C.mono, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>0.67 SOL</span>
                </div>

                {/* Claim All */}
                <div
                  style={{
                    opacity: claimBtnOp,
                    marginTop: 14,
                    padding: "12px 0",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                    textAlign: "center",
                    boxShadow: `0 4px 16px ${C.green}25, 0 0 ${claimPulse * 30}px ${C.green}12`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, fontFamily: C.font, position: "relative", zIndex: 1 }}>Claim All (3 vaults)</span>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent)", borderRadius: "12px 12px 0 0" }} />
                </div>

                {(() => { const s = shimmerStyle(frame, 98, 35); return s ? <div style={s} /> : null; })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
