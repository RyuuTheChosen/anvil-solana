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
import { Cursor } from "../Cursor";

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

/* ── Shared data ── */

const MOCK_HOLDERS = [
  { rank: 1, addr: "7xKp...R2mD", pct: 8.4, sol: 12.847, score: 98.2 },
  { rank: 2, addr: "3Fnw...vQ8e", pct: 6.1, sol: 9.331, score: 94.7 },
  { rank: 3, addr: "9Btx...kL4a", pct: 5.3, sol: 8.102, score: 91.3 },
  { rank: 4, addr: "2Wqm...pN7f", pct: 4.7, sol: 7.189, score: 87.1 },
  { rank: 5, addr: "6Jdv...tH2c", pct: 3.9, sol: 5.963, score: 82.6 },
  { rank: 6, addr: "8Mrz...sY5b", pct: 3.2, sol: 4.891, score: 78.4 },
  { rank: 7, addr: "4Cne...wK9g", pct: 2.8, sol: 4.281, score: 73.9 },
];

const RANK_COLORS = [C.green, C.green, C.green, C.cyan, C.cyan, C.accent, C.accent];

/*
 * ═══════════════════════════════════════════════
 *  SCENE 1: TITLE  (55 frames / ~1.8s)
 * ═══════════════════════════════════════════════
 */

const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();

  const badgeOp = interpolate(frame, [5, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 22], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [22, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Background />
      <div style={{
        opacity: badgeOp, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: 6, color: C.green, fontFamily: C.font, marginBottom: 16, zIndex: 1,
      }}>
        Feature Spotlight
      </div>
      <div style={{
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        fontSize: 52, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -2,
        zIndex: 1,
      }}>
        Top Holder<span style={{ color: C.green }}> Distribution</span>
      </div>
      <div style={{
        opacity: subOp, fontSize: 18, color: C.muted, fontFamily: C.font, marginTop: 12,
        zIndex: 1,
      }}>
        Choose exactly how many holders earn from every trade
      </div>
    </AbsoluteFill>
  );
};

/*
 * ═══════════════════════════════════════════════
 *  SCENE 2: SLIDER CONFIG  (120 frames / 4s)
 *  Creator drags "Max Holders" slider 100→512→256
 * ═══════════════════════════════════════════════
 */

// Slider layout (centered panel, 480px track)
const PANEL_W = 536;
const TRACK_W = 480;
const TRACK_LEFT = (1920 - TRACK_W) / 2; // 720
const TRACK_Y = 610;

// Cursor: enter → grab at 100 → drag to 420 → 512 → settle 256 → exit
const SL_FRAMES = [10, 22, 25,  44,   58,   78,  95, 112];
const slToX = (h: number) => TRACK_LEFT + ((h - 100) / 412) * TRACK_W;
const SL_X = [1550, slToX(100) + 6, slToX(100), slToX(420), slToX(512), slToX(256), slToX(256), 1550];
const SL_Y = [680, TRACK_Y, TRACK_Y, TRACK_Y, TRACK_Y, TRACK_Y, TRACK_Y, 680];
const SL_GRAB = 25;

const SceneSlider: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleOp = interpolate(frame, [3, 13], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [3, 13], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Panel entrance
  const panelProgress = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 100 } });
  const panelS = interpolate(panelProgress, [0, 1], [0.88, 1]);
  const panelOp = interpolate(frame, [8, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor position → drives slider
  const curX = cursorLerp(frame, SL_FRAMES, SL_X);
  const curY = cursorLerp(frame, SL_FRAMES, SL_Y);
  const isDragging = frame >= SL_GRAB && frame <= 95;

  const rawCount = Math.round(100 + ((curX - TRACK_LEFT) / TRACK_W) * 412);
  const holderCount = isDragging
    ? Math.max(100, Math.min(512, rawCount))
    : frame < SL_GRAB ? 100 : 256;

  const sliderPct = ((holderCount - 100) / 412) * 100;
  const thumbOp = interpolate(frame, [14, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const presetsOp = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor visuals
  const cursorOp = interpolate(
    frame,
    [SL_FRAMES[0], SL_FRAMES[0] + 8, SL_FRAMES[SL_FRAMES.length - 2], SL_FRAMES[SL_FRAMES.length - 1]],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const clickRel = frame - SL_GRAB;
  const showRipple = clickRel >= 0 && clickRel < 16;
  const rippleP = showRipple ? clickRel / 16 : 0;

  return (
    <AbsoluteFill>
      <Background />

      {/* Centered column: title + panel */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {/* Title */}
        <div style={{
          textAlign: "center", marginBottom: 28,
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 5,
            color: C.accent, fontFamily: C.font, marginBottom: 8,
          }}>
            Configure
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: C.white, fontFamily: C.font, letterSpacing: -1,
          }}>
            Set Your <span style={{ color: C.green }}>Max Holders</span>
          </div>
          <div style={{
            opacity: subOp, fontSize: 14, color: C.muted, fontFamily: C.font, marginTop: 6,
          }}>
            When launching, slide to choose how many top holders receive distributions
          </div>
        </div>

        {/* Panel */}
        <div style={{
          opacity: panelOp, transform: `scale(${panelS})`,
          width: PANEL_W, padding: "28px 28px", borderRadius: 24,
          border: `1px solid ${C.borderLight}`, backgroundColor: C.card,
          boxShadow: `0 16px 60px rgba(0,0,0,0.5), 0 0 50px ${C.green}06`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: C.muted, fontFamily: C.font }}>
              Max Holders
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: `${C.muted}80`, fontFamily: C.font,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Set at launch
            </span>
          </div>

          {/* Big number */}
          <div style={{
            fontSize: 72, fontWeight: 900, fontFamily: C.mono, color: C.white,
            lineHeight: 1, marginBottom: 20, letterSpacing: -3,
            textShadow: isDragging ? `0 0 30px ${C.green}40` : "none",
          }}>
            {holderCount}
            <span style={{ fontSize: 18, fontWeight: 600, color: C.muted, fontFamily: C.font, letterSpacing: 0, marginLeft: 10 }}>
              holders
            </span>
          </div>

          {/* Slider track */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{
              width: "100%", height: 12, borderRadius: 6, backgroundColor: C.dark,
              position: "relative", overflow: "visible",
            }}>
              <div style={{
                width: `${sliderPct}%`, height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
                boxShadow: sliderPct > 2 ? `0 0 16px ${C.green}50` : "none",
              }} />
              <div style={{
                position: "absolute", top: "50%", left: `${sliderPct}%`,
                transform: "translate(-50%, -50%)",
                width: 24, height: 24, borderRadius: "50%",
                backgroundColor: C.white, border: `3px solid ${C.dark}`,
                boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 ${isDragging ? 22 : 8}px ${C.green}${isDragging ? "60" : "20"}`,
                opacity: thumbOp,
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, fontFamily: C.mono }}>100</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, fontFamily: C.mono }}>512</span>
            </div>
          </div>

          {/* Preset pills */}
          <div style={{ display: "flex", gap: 7, opacity: presetsOp }}>
            {[100, 200, 256, 350, 512].map((p) => {
              const isActive = Math.abs(holderCount - p) < 30;
              return (
                <div key={p} style={{
                  padding: "6px 16px", borderRadius: 8,
                  fontSize: 12, fontWeight: 600, fontFamily: C.mono,
                  backgroundColor: isActive ? `${C.green}18` : "rgba(255,255,255,0.04)",
                  color: isActive ? C.green : C.muted,
                  border: isActive ? `1px solid ${C.green}25` : "1px solid transparent",
                  boxShadow: isActive ? `0 0 10px ${C.green}10` : "none",
                }}>
                  {p}
                </div>
              );
            })}
          </div>

          {/* Description */}
          <div style={{
            marginTop: 14, fontSize: 11, color: `${C.muted}90`, fontFamily: C.font, lineHeight: 1.5,
            opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}>
            Top holders ranked by balance and hold time. Distribution locked at launch.
          </div>
        </div>
      </div>

      {/* Cursor */}
      {cursorOp > 0 && (
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
      )}
    </AbsoluteFill>
  );
};

/*
 * ═══════════════════════════════════════════════
 *  SCENE 3: LEADERBOARD  (130 frames / ~4.3s)
 *  Holder table + rewards count up + info cards
 * ═══════════════════════════════════════════════
 */

const SceneLeaderboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const HOLDER_COUNT = 256;

  // Title
  const titleOp = interpolate(frame, [3, 13], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [3, 13], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Board panel
  const boardProgress = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 80 } });
  const boardS = interpolate(boardProgress, [0, 1], [0.92, 1]);
  const boardOp = interpolate(frame, [15, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Rewards count up
  const rewardP = interpolate(frame, [40, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Info cards
  const infoCards = [
    { label: "Scoring", desc: "Balance + hold time weighted", icon: "M9 11l3 3L22 4", color: C.green },
    { label: "Frequency", desc: "Hourly distributions", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2", color: C.cyan },
    { label: "On-chain", desc: "Merkle proof verified", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: C.accent },
  ];

  // Value prop
  const valueOp = interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const valueY = interpolate(frame, [100, 115], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Background />

      {/* Centered column: title + panels */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {/* Title */}
        <div style={{
          textAlign: "center", marginBottom: 24,
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 5,
            color: C.cyan, fontFamily: C.font, marginBottom: 8,
          }}>
            Leaderboard
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: C.white, fontFamily: C.font, letterSpacing: -1,
          }}>
            Ranked Holders, <span style={{ color: C.green }}>Real Rewards</span>
          </div>
          <div style={{
            opacity: subOp, fontSize: 14, color: C.muted, fontFamily: C.font, marginTop: 6,
          }}>
            Every hour, top holders are scored and paid automatically in SOL
          </div>
        </div>

        {/* Two-panel row */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 32, padding: "0 80px",
        }}>
        {/* LEFT: Holder table */}
        <div style={{
          opacity: boardOp, transform: `scale(${boardS})`,
          width: 560, padding: "22px 26px", borderRadius: 22,
          border: `1px solid ${C.borderLight}`, backgroundColor: C.card,
          boxShadow: `0 12px 50px rgba(0,0,0,0.5), 0 0 40px ${C.green}04`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: C.white, fontFamily: C.font }}>
                Top Holders
              </span>
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: 8,
              backgroundColor: `${C.green}12`, border: `1px solid ${C.green}20`,
              fontSize: 11, fontWeight: 700, color: C.green, fontFamily: C.mono,
            }}>
              {HOLDER_COUNT} eligible
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "6px 8px", marginBottom: 4,
            fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5,
            color: C.muted, fontFamily: C.font,
          }}>
            <span style={{ width: 34 }}>#</span>
            <span style={{ flex: 1 }}>Wallet</span>
            <span style={{ width: 65, textAlign: "right" }}>Hold %</span>
            <span style={{ width: 65, textAlign: "right" }}>Score</span>
            <span style={{ width: 90, textAlign: "right" }}>Reward</span>
          </div>

          {/* Rows */}
          {MOCK_HOLDERS.map((h, i) => {
            const rowDelay = 22 + i * 7;
            const rowOp = interpolate(frame, [rowDelay, rowDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const rowX = interpolate(frame, [rowDelay, rowDelay + 12], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const solDisplay = (h.sol * rewardP).toFixed(3);
            const color = RANK_COLORS[i] || C.muted;
            const isTop3 = i < 3;

            return (
              <div key={h.rank} style={{
                opacity: rowOp, transform: `translateX(${rowX}px)`,
                display: "flex", alignItems: "center",
                padding: "10px 8px", borderRadius: 12,
                backgroundColor: isTop3 ? `${color}08` : "transparent",
                border: isTop3 ? `1px solid ${color}12` : "1px solid transparent",
                marginBottom: 3,
              }}>
                <div style={{ width: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isTop3 ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: 7,
                      backgroundColor: `${color}18`, border: `1px solid ${color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color, fontFamily: C.mono,
                    }}>
                      {h.rank}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: C.mono }}>{h.rank}</span>
                  )}
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${color}40, ${color}15)`,
                    border: `1px solid ${color}25`,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: C.mono }}>{h.addr}</span>
                </div>
                <span style={{ width: 65, textAlign: "right", fontSize: 12, fontWeight: 600, color: C.text, fontFamily: C.mono }}>
                  {h.pct}%
                </span>
                <span style={{ width: 65, textAlign: "right", fontSize: 12, fontWeight: 600, color, fontFamily: C.mono }}>
                  {(h.score * rewardP).toFixed(1)}
                </span>
                <div style={{ width: 90, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, fontFamily: C.mono,
                    color: rewardP > 0.5 ? C.green : C.muted,
                  }}>
                    {solDisplay}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: C.muted, fontFamily: C.font }}>SOL</span>
                </div>
              </div>
            );
          })}

          {/* "+N more" */}
          <div style={{
            opacity: interpolate(frame, [75, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            textAlign: "center", padding: "10px 0 4px", fontSize: 12, color: C.muted, fontFamily: C.font,
          }}>
            <span style={{ color: C.green, fontWeight: 600 }}>+{HOLDER_COUNT - 7}</span> more holders earning rewards
          </div>
        </div>

        {/* RIGHT: Info cards + value prop */}
        <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
          {infoCards.map((card, i) => {
            const cDelay = 50 + i * 12;
            const cOp = interpolate(frame, [cDelay, cDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cY = interpolate(frame, [cDelay, cDelay + 15], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={card.label} style={{
                opacity: cOp, transform: `translateY(${cY}px)`,
                padding: "18px 20px", borderRadius: 18,
                backgroundColor: `${C.card}e0`, border: `1px solid ${card.color}15`,
                borderLeft: `3px solid ${card.color}50`,
                boxShadow: `0 6px 28px rgba(0,0,0,0.3)`,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: `${card.color}12`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.icon} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, lineHeight: 1.4 }}>{card.desc}</div>
                </div>
              </div>
            );
          })}

          {/* Value prop */}
          <div style={{
            opacity: valueOp, transform: `translateY(${valueY}px)`,
            padding: "20px 24px", borderRadius: 18,
            border: `1px solid ${C.borderLight}`, backgroundColor: `${C.card}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.white, fontFamily: C.font, lineHeight: 1.3, marginBottom: 6 }}>
              You decide who earns.
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font, lineHeight: 1.5 }}>
              From <span style={{ color: C.green, fontWeight: 700, fontFamily: C.mono }}>100</span> to{" "}
              <span style={{ color: C.cyan, fontWeight: 700, fontFamily: C.mono }}>512</span> top holders,
              automatically ranked and paid every hour.
            </div>
          </div>
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
};

/*
 * ═══════════════════════════════════════════════
 *  SCENE 4: CTA  (70 frames / ~2.3s)
 * ═══════════════════════════════════════════════
 */

const SceneCTA: React.FC = () => {
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
      <Background />
      {/* Dramatic glow */}
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
 * ═══════════════════════════════════════════════
 *  MAIN COMPOSITION
 *  Sequences: Title(55) → Slider(120) → Board(130) → CTA(70)
 *  Total: 375 frames / ~12.5s
 * ═══════════════════════════════════════════════
 */

export const TopHolderSlider: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Sequence from={0} durationInFrames={55}>
        <SceneTitle />
      </Sequence>

      <Sequence from={55} durationInFrames={120}>
        <SceneSlider />
      </Sequence>

      <Sequence from={175} durationInFrames={130}>
        <SceneLeaderboard />
      </Sequence>

      <Sequence from={305} durationInFrames={70}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
