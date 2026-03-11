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
 * AI HOOK — 90 frames (3s)
 * Floating app panel with chat interface: typed prompt → response with vault cards
 */

const PROMPT = "check my rewards";

const VAULTS = [
  { name: "FORGE", symbol: "F", amount: "0.42", color: C.green },
  { name: "APEX", symbol: "A", amount: "0.18", color: C.cyan },
  { name: "DRIFT", symbol: "D", amount: "0.07", color: C.accent },
];

export const AiHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene transitions
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterScale = interpolate(frame, [0, 14], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [78, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitBlur = interpolate(frame, [80, 90], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Typing
  const typedChars = Math.floor(
    interpolate(frame, [12, 32], [0, PROMPT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const caretBlink = Math.sin(frame * 0.4) > 0;
  const inputGlow = interpolate(frame, [12, 16, 34, 38], [0, 1, 1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Mascot + response
  const responseProgress = spring({ frame: frame - 38, fps, config: { damping: 12, stiffness: 110 } });
  const responseScale = interpolate(responseProgress, [0, 1], [0.92, 1]);
  const responseOp = interpolate(frame, [37, 43], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dotPulse = 0.5 + Math.sin(frame * 0.15) * 0.5;
  const panelGlow = 0.3 + Math.sin(frame * 0.06) * 0.15;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 40% 35%, #0e0e1c 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 200, y: 100, size: 500, color: C.green, speed: 0.012, phase: 0 },
          { x: 1400, y: 550, size: 450, color: C.accent, speed: 0.015, phase: 2 },
          { x: 900, y: 150, size: 380, color: C.cyan, speed: 0.018, phase: 4 },
          { x: 700, y: 700, size: 350, color: C.green, speed: 0.009, phase: 5.5 },
        ]}
      />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 560,
          right: 560,
          bottom: 160,
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
        {/* Gradient top edge */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.green}4d, transparent)`, flexShrink: 0 }} />

        {/* Header bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${C.border}cc`,
            backgroundColor: `${C.dark}b3`,
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Img
              src={staticFile("anvil-mascot.png")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
              }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.font }}>
                Anvil AI
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: C.green,
                    boxShadow: `0 0 ${4 + dotPulse * 4}px ${C.green}`,
                  }}
                />
                <span style={{ fontSize: 11, color: C.green, fontFamily: C.font }}>online</span>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              backgroundColor: `${C.dark}99`,
              fontSize: 11,
              fontWeight: 500,
              color: C.muted,
              fontFamily: C.font,
            }}
          >
            8 chats left today
          </div>
        </div>

        {/* Chat body */}
        <div
          style={{
            flex: 1,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflow: "hidden",
          }}
        >
          {/* User message */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                padding: "14px 20px",
                borderRadius: 18,
                borderBottomRightRadius: 4,
                background: `linear-gradient(135deg, ${C.accent}, #5b21b6)`,
                boxShadow: `0 4px 20px ${C.accent}35`,
                maxWidth: "70%",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 500, color: C.white, fontFamily: C.mono }}>
                {PROMPT.slice(0, typedChars)}
                {frame < 36 && frame >= 12 && (
                  <span style={{ opacity: caretBlink ? 1 : 0, fontWeight: 300, marginLeft: 1 }}>|</span>
                )}
              </span>
            </div>
          </div>

          {/* Thinking dots */}
          {frame >= 34 && frame < 42 && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Img
                src={staticFile("anvil-mascot.png")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: 16,
                  borderTopLeftRadius: 4,
                  border: `1px solid ${C.border}`,
                  backgroundColor: `${C.dark}99`,
                  display: "flex",
                  gap: 5,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: C.green,
                      opacity: 0.3 + Math.sin(frame * 0.35 + i * 1.2) * 0.5,
                      boxShadow: `0 0 6px ${C.green}30`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI response card */}
          {frame >= 38 && (
            <div
              style={{
                opacity: responseOp,
                transform: `scale(${responseScale})`,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Img
                src={staticFile("anvil-mascot.png")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderTopLeftRadius: 4,
                  border: `1px solid ${C.border}`,
                  backgroundColor: `${C.dark}cc`,
                  padding: "16px 20px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                    fontFamily: C.font,
                    marginBottom: 14,
                    opacity: interpolate(frame, [42, 47], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  }}
                >
                  Found claimable rewards in <span style={{ color: C.green }}>3 vaults</span>:
                </div>

                {/* Vault rows */}
                {VAULTS.map((v, i) => {
                  const rowDelay = 46 + i * 6;
                  const rowProgress = spring({ frame: frame - rowDelay, fps, config: { damping: 14, stiffness: 140 } });
                  const rowOp = interpolate(frame - rowDelay, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const rowX = interpolate(rowProgress, [0, 1], [16, 0]);

                  return (
                    <div
                      key={v.name}
                      style={{
                        opacity: rowOp,
                        transform: `translateX(${rowX}px)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1px solid ${v.color}15`,
                        backgroundColor: `${v.color}06`,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: `${v.color}1a`,
                            border: `1px solid ${v.color}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: v.color,
                            fontFamily: C.font,
                          }}
                        >
                          {v.symbol}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.white, fontFamily: C.font }}>
                          {v.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: v.color,
                          fontFamily: C.mono,
                          textShadow: `0 0 10px ${v.color}30`,
                        }}
                      >
                        {v.amount} SOL
                      </span>
                    </div>
                  );
                })}

                {/* Total */}
                <div
                  style={{
                    opacity: interpolate(frame, [68, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                    paddingTop: 12,
                    borderTop: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, fontFamily: C.font }}>
                    Total Claimable
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontFamily: C.mono,
                      background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    0.67 SOL
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar at bottom */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${C.border}cc`,
            backgroundColor: `${C.dark}80`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${inputGlow > 0.5 ? `${C.accent}4d` : C.border}`,
              backgroundColor: C.dark,
              fontSize: 14,
              color: frame >= 12 ? C.white : `${C.muted}66`,
              fontFamily: C.mono,
              boxShadow: inputGlow > 0 ? `0 0 0 3px ${C.accent}0d, 0 0 ${12 * inputGlow}px ${C.accent}15` : "none",
            }}
          >
            {frame >= 12 ? PROMPT.slice(0, typedChars) : "Ask anything..."}
            {frame >= 12 && frame < 36 && caretBlink && (
              <span style={{ color: C.accent, fontWeight: 300, marginLeft: 1 }}>|</span>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
