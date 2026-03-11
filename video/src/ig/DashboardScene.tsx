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
import { Cursor } from "../Cursor";
import { AnimGrid, FloatingOrbs } from "./shared";

/* ── Real data matching VaultDashboard.tsx ── */

const stats = [
  { label: "Total Allocated", value: 12.45, suffix: " SOL", decimals: 2, color: C.green,
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  { label: "Merkle Updates", value: 38, suffix: "", decimals: 0, color: C.white,
    icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" },
  { label: "Holders", value: 247, suffix: "", decimals: 0, color: C.white,
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" },
  { label: "Your Claimable", value: 0.82, suffix: " SOL", decimals: 2, color: C.cyan,
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
];

const holders = [
  { rank: 1, wallet: "7xK...3nv1", amount: "2.45 SOL", score: "100.0" },
  { rank: 2, wallet: "9mP...8fq1", amount: "1.82 SOL", score: "74.3" },
  { rank: 3, wallet: "4bR...2wk1", amount: "1.21 SOL", score: "49.4" },
  { rank: 4, wallet: "2hF...5jm1", amount: "0.94 SOL", score: "38.4" },
  { rank: 5, wallet: "8kL...7mp1", amount: "0.67 SOL", score: "27.3" },
];

const flowNodes = [
  { label: "Vault", sub: "Fee receiver", addr: "9xK2...4bnv", color: C.green,
    icon: "M3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2zM1 9h22M9 21V9" },
  { label: "Vault Pool", sub: "SOL reserve", addr: "3mPq...8fq2", color: C.cyan,
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  { label: "Distribution", sub: "Merkle root", addr: "7bR1...2wk3", color: C.accent,
    icon: "M12 20V10M18 20V4M6 20v-4" },
];

const navItems = ["Launch", "Explore", "Vaults", "Docs"];
const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32"];

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Scene transitions ── */
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const enterBlur = interpolate(frame, [0, 18], [10, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const enterScale = interpolate(frame, [0, 20], [0.94, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const zoomIn = interpolate(frame, [118, 138, 150], [1, 1.7, 1.8], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const zoomOriginX = interpolate(frame, [110, 126], [650, 430], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const zoomOriginY = interpolate(frame, [110, 126], [500, 70], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [150, 169], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [155, 169], [0, 6], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Header card entrance ── */
  const cardOp = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cardBlur = interpolate(frame, [8, 16], [8, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Stat box animations ── */
  const statAnims = stats.map((_, i) => {
    const d = 22 + i * 8;
    const sp = spring({ frame: frame - d, fps, config: { damping: 10, stiffness: 140, mass: 0.8 } });
    return {
      opacity: interpolate(frame - d, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      blur: interpolate(frame - d, [0, 8], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      scale: interpolate(sp, [0, 1], [1.6, 1]),
      y: interpolate(sp, [0, 1], [20, 0]),
    };
  });

  const counterProg = interpolate(frame, [28, 80], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Flow node animations ── */
  const flowAnims = flowNodes.map((_, i) => {
    const d = 50 + i * 10;
    const sp = spring({ frame: frame - d, fps, config: { damping: 12, stiffness: 120 } });
    return {
      opacity: interpolate(frame - d, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      x: interpolate(sp, [0, 1], [-20, 0]),
      blur: interpolate(frame - d, [0, 6], [6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    };
  });

  /* ── Holder row animations ── */
  const holderAnims = holders.map((_, i) => {
    const d = 62 + i * 6;
    const sp = spring({ frame: frame - d, fps, config: { damping: 12, stiffness: 120 } });
    return {
      opacity: interpolate(frame - d, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      x: interpolate(sp, [0, 1], [30, 0]),
      blur: interpolate(frame - d, [0, 6], [6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    };
  });

  const holdersEndOp = interpolate(frame, [82, 92], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const dotPulse = 0.5 + Math.sin(frame * 0.15) * 0.5;

  /* ── Card styles matching real app (bg-pump-card, border-pump-border, rounded-2xl) ── */
  const card: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    backgroundColor: C.card,
  };
  const statBox: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${C.border}80`,
    backgroundColor: `${C.dark}cc`,
    padding: 14,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.dark,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale * zoomIn})`,
        transformOrigin: `${(zoomOriginX / 1080) * 100}% ${(zoomOriginY / 1080) * 100}%`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 50,
          right: 50,
          bottom: 50,
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          backgroundColor: `${C.card}e6`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03)`,
          overflow: "hidden",
        }}
      >
      {/* ═══ NAVBAR — matches real Navbar.tsx ═══ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          borderBottom: `1px solid ${C.border}cc`,
          backgroundColor: `${C.dark}b3`,
          backdropFilter: "blur(16px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Img src={staticFile("logo.svg")} style={{ width: 26, height: 26 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.font, letterSpacing: -0.3 }}>
              Anvil<span style={{ color: C.green }}> Protocol</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {navItems.map((item, i) => (
              <div
                key={item}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: i === 1 ? C.white : C.muted,
                  fontFamily: C.font,
                  backgroundColor: i === 1 ? "rgba(255,255,255,0.07)" : "transparent",
                  position: "relative",
                }}
              >
                {item}
                {i === 1 && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 14, right: 14,
                    height: 2, borderRadius: 1,
                    background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: `${C.dark}99`,
            padding: "6px 12px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 500, color: C.white }}>4.201</span>
            <span style={{ fontSize: 10, color: C.muted }}>SOL</span>
          </div>
          <div style={{
            padding: "6px 16px", borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, #6d28d9)`,
            fontSize: 12, fontWeight: 600, color: C.white, fontFamily: C.font,
          }}>
            7xK...3nv1
          </div>
        </div>
      </div>

      {/* ═══ HEADER CARD — matches real VaultDashboard.tsx ═══ */}
      <div
        style={{
          position: "absolute",
          top: 68,
          left: 24,
          right: 24,
          opacity: cardOp,
          filter: `blur(${cardBlur}px)`,
          ...card,
          overflow: "hidden",
        }}
      >
        {/* Gradient top line — real app pattern */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.green}4d, transparent)` }} />

        <div style={{ padding: 24 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Token icon with checkmark badge — matches real UI */}
              <div style={{
                position: "relative", width: 48, height: 48, borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: `linear-gradient(135deg, ${C.green}26, ${C.accent}1a)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font,
              }}>
                D
                <div style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 18, height: 18, borderRadius: "50%",
                  backgroundColor: C.green, border: `2px solid ${C.card}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: C.font }}>$DEMO</div>
                <div style={{ fontSize: 12, fontFamily: C.mono, color: C.muted, marginTop: 2 }}>DEMO · 7xK...3nv1</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                borderRadius: 8, border: `1px solid ${C.border}`,
                backgroundColor: `${C.dark}80`, padding: "6px 12px",
                fontSize: 11, fontWeight: 500, color: C.text, fontFamily: C.font,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Analytics
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                borderRadius: 8, border: `1px solid ${C.green}26`,
                backgroundColor: `${C.green}0f`, padding: "6px 12px",
                fontSize: 11, fontWeight: 500, color: C.green, fontFamily: C.font,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green,
                  boxShadow: `0 0 ${4 + dotPulse * 4}px ${C.green}`,
                }} />
                Active
              </div>
            </div>
          </div>

          {/* Stat boxes — 4-column grid matching real StatBox component */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {stats.map((stat, i) => {
              const a = statAnims[i];
              const val = stat.decimals > 0
                ? (stat.value * counterProg).toFixed(stat.decimals)
                : Math.round(stat.value * counterProg);
              return (
                <div
                  key={stat.label}
                  style={{
                    ...statBox,
                    opacity: a.opacity,
                    transform: `translateY(${a.y}px) scale(${a.scale})`,
                    filter: `blur(${a.blur}px)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={`${C.muted}80`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={stat.icon} />
                    </svg>
                    <span style={{
                      fontSize: 10, fontWeight: 500, textTransform: "uppercase",
                      letterSpacing: 1, color: C.muted, fontFamily: C.font,
                    }}>
                      {stat.label}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: C.mono, fontSize: 18, fontWeight: 700,
                    color: stat.color, letterSpacing: -0.5,
                  }}>
                    {val}{stat.suffix}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ TWO-COLUMN CONTENT ═══ */}
      <div style={{ position: "absolute", top: 300, left: 24, right: 24, display: "flex", gap: 16 }}>

        {/* Left — On-Chain Fee Flow (matches real FlowNode/FlowConnector) */}
        <div style={{ width: 280, flexShrink: 0, ...card, padding: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: 3, color: C.muted, fontFamily: C.font, marginBottom: 20,
          }}>
            On-Chain Fee Flow
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {flowNodes.map((node, i) => {
              const a = flowAnims[i];
              return (
                <React.Fragment key={node.label}>
                  <div style={{
                    width: "100%", opacity: a.opacity,
                    transform: `translateX(${a.x}px)`, filter: `blur(${a.blur}px)`,
                    borderRadius: 12, border: `1px solid ${C.border}99`,
                    backgroundColor: `${C.dark}99`,
                    boxShadow: `inset 0 0 0 1px ${node.color}33`,
                    padding: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        backgroundColor: `${node.color}1a`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={node.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={node.icon} />
                        </svg>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: C.font }}>{node.label}</span>
                          <span style={{ fontSize: 9, color: C.muted, fontFamily: C.font }}>{node.sub}</span>
                        </div>
                        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 2 }}>{node.addr}</div>
                      </div>
                    </div>
                  </div>
                  {i < flowNodes.length - 1 && (
                    <div style={{
                      position: "relative", width: 1, height: 28,
                      background: `linear-gradient(180deg, ${C.borderLight}, ${C.border})`,
                      opacity: a.opacity,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" style={{ position: "absolute", bottom: -4, left: -3.5 }} fill={C.borderLight}>
                        <path d="M4 8L0 4h8z" />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Connector to Holders end node */}
            <div style={{
              position: "relative", width: 1, height: 28,
              background: `linear-gradient(180deg, ${C.borderLight}, ${C.border})`,
              opacity: flowAnims[2]?.opacity ?? 0,
            }}>
              <svg width="8" height="8" viewBox="0 0 8 8" style={{ position: "absolute", bottom: -4, left: -3.5 }} fill={C.borderLight}>
                <path d="M4 8L0 4h8z" />
              </svg>
            </div>

            {/* Holders end node — matches real FlowEndNode */}
            <div style={{
              width: "100%", opacity: holdersEndOp,
              borderRadius: 12, border: `1px solid ${C.border}99`,
              backgroundColor: `${C.dark}99`,
              boxShadow: `inset 0 0 0 1px ${C.pink}33`,
              padding: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: `${C.pink}1a`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: C.font }}>Holders</span>
                  <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 2 }}>247 eligible</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Top Holders table (matches real leaderboard) */}
        <div style={{ flex: 1, ...card, overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: `1px solid ${C.border}80`, padding: "14px 20px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: 3, color: C.muted, fontFamily: C.font,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Top Holders
            </div>
            <span style={{
              borderRadius: 6, backgroundColor: "rgba(255,255,255,0.05)",
              padding: "4px 8px", fontSize: 10, fontWeight: 500,
              color: C.muted, fontFamily: C.mono,
            }}>
              5 / 247
            </span>
          </div>

          {/* Column headers — matches real table */}
          <div style={{
            display: "grid", gridTemplateColumns: "36px 1fr 1fr 60px",
            gap: 12, padding: "10px 20px",
            fontSize: 9, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: 2, color: C.muted, fontFamily: C.font,
          }}>
            <span>#</span>
            <span>Wallet</span>
            <span style={{ textAlign: "right" }}>Cumulative</span>
            <span style={{ textAlign: "right" }}>Score</span>
          </div>

          <div style={{ padding: "0 16px 16px" }}>
            {holders.map((h, i) => {
              const a = holderAnims[i];
              const isYou = i === 2;
              return (
                <div
                  key={h.rank}
                  style={{
                    display: "grid", gridTemplateColumns: "36px 1fr 1fr 60px",
                    alignItems: "center", gap: 12,
                    padding: "10px 4px", borderRadius: 8,
                    opacity: a.opacity,
                    transform: `translateX(${a.x}px)`,
                    filter: `blur(${a.blur}px)`,
                    backgroundColor: isYou ? `${C.green}0f` : "transparent",
                    boxShadow: isYou ? `inset 0 0 0 1px ${C.green}1a` : "none",
                  }}
                >
                  <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: rankColors[i] || C.muted }}>
                    {i < 3 ? (
                      <span style={{
                        display: "inline-flex", width: 22, height: 22,
                        alignItems: "center", justifyContent: "center",
                        borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)",
                      }}>
                        {h.rank}
                      </span>
                    ) : h.rank}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 12, color: C.white }}>{h.wallet}</span>
                    {isYou && (
                      <span style={{
                        borderRadius: 3, backgroundColor: `${C.green}1a`,
                        padding: "2px 6px", fontSize: 9, fontWeight: 700,
                        color: C.green, fontFamily: C.font,
                      }}>YOU</span>
                    )}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 12, color: C.text, fontFamily: C.mono }}>{h.amount}</span>
                  <span style={{ textAlign: "right", fontSize: 12, color: C.muted, fontFamily: C.mono }}>{h.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      </div>{/* end floating panel */}

      {/* Cursor */}
      <Cursor
        waypoints={[
          { frame: 35, x: 900, y: 800 },
          { frame: 50, x: 300, y: 265 },
          { frame: 62, x: 530, y: 265 },
          { frame: 74, x: 760, y: 265 },
          { frame: 90, x: 180, y: 550 },
          { frame: 110, x: 650, y: 500 },
          { frame: 128, x: 430, y: 70 },
          { frame: 138, x: 430, y: 70, click: true },
        ]}
      />
    </AbsoluteFill>
  );
};
