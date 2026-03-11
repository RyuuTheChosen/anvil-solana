import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  Audio,
  staticFile,
} from "remotion";
import { C } from "./colors";
import { Cursor, CursorWaypoint } from "./Cursor";
import { SlamText } from "./effects";

const GREEN_BG = "linear-gradient(160deg, #00ff88, #00cc66 40%, #0a3d2a 100%)";

/* ─────────── SceneHook (reused) ─────────── */

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOp = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [8, 32], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoSize = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 40 },
  });
  const logoSizePx = interpolate(logoSize, [0, 1], [45, 85]);

  const cardScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const cardOp = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalLogoSize = interpolate(frame, [30, 48], [logoSizePx, 78], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const resolvedLogoSize = frame < 30 ? logoSizePx : finalLogoSize;

  const fadeOut = interpolate(frame, [85, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <AbsoluteFill style={{ background: GREEN_BG }} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: 32,
            backgroundColor: C.dark,
            opacity: cardOp,
            transform: `scale(${cardScale})`,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)",
          }}
        />
        <div
          style={{
            opacity: logoOp,
            filter: `blur(${logoBlur}px)`,
            zIndex: 1,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: resolvedLogoSize, height: resolvedLogoSize }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─────────── SceneStepTitle ─────────── */

const SceneStepTitle: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(frame, [45, 60], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOp = interpolate(frame, [15, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [15, 28], [10, 0], {
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
        opacity: fadeOut,
      }}
    >
      <SlamText fontSize={72}>How to Create a Vault</SlamText>
      <div
        style={{
          opacity: subtitleOp,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 28,
          fontWeight: 500,
          color: C.accent,
          fontFamily: C.font,
          marginTop: 16,
        }}
      >
        existing Pump.fun tokens
      </div>
    </AbsoluteFill>
  );
};

/* ─────────── TypeText ─────────── */

const TypeText: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  endFrame: number;
  color?: string;
}> = ({ text, frame, startFrame, endFrame, color }) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chars = Math.floor(progress * text.length);
  const show = text.substring(0, chars);
  const showCaret = progress > 0 && progress < 1;
  return (
    <>
      {show}
      {showCaret && (
        <span style={{ color: color || C.accent, fontWeight: 300 }}>|</span>
      )}
    </>
  );
};

/* ─────────── Fee Presets ─────────── */

const FEE_PRESETS = [
  { label: "All Holders", value: 100 },
  { label: "75 / 25", value: 75 },
  { label: "50 / 50", value: 50 },
  { label: "25 / 75", value: 25 },
  { label: "All LP", value: 0 },
];

const HOLDER_PRESETS = [100, 200, 256, 350, 512];

/* ─────────── SceneDashboard ─────────── */
// Local frames 0-399 (global 160-560)

const DASHBOARD_WAYPOINTS: CursorWaypoint[] = [
  { frame: 10, x: 1400, y: 950 },
  { frame: 35, x: 880, y: 430 },
  { frame: 45, x: 860, y: 425, click: true },
  { frame: 95, x: 860, y: 425 },
  { frame: 115, x: 700, y: 640 },
  { frame: 160, x: 1020, y: 640 },
  { frame: 180, x: 1120, y: 775 },
  { frame: 190, x: 1120, y: 775, click: true },
  { frame: 205, x: 920, y: 830 },
  { frame: 210, x: 920, y: 830, click: true },
  { frame: 240, x: 960, y: 920 },
  { frame: 255, x: 960, y: 920, click: true },
  { frame: 285, x: 1060, y: 850 },
  { frame: 310, x: 1060, y: 850, click: true },
  { frame: 350, x: 960, y: 750 },
  { frame: 380, x: 1100, y: 650 },
];

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  angle: (i / 24) * Math.PI * 2 + i * 0.17,
  speed: 180 + (i % 6) * 70,
  color: [C.green, C.cyan, C.pink, C.white, "#ffd700", C.accent][i % 6],
  size: 4 + (i % 3) * 3,
  delay: (i % 4) * 2,
}));

const WHAT_HAPPENS = [
  { num: "1", text: "Vault is created on-chain with fee and pool PDAs", color: C.accent },
  { num: "2", text: "Fee sharing is configured to point to Anvil vault", color: C.accent },
  { num: "3", text: "Creator fees flow into the vault automatically", color: C.green },
  { num: "4", text: "Top holders receive distributions every hour", color: C.green },
];

const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Zoom state machine ──
  const scale = interpolate(
    frame,
    [0, 35, 100, 170, 220, 270, 330, 380],
    [0.78, 0.88, 1.25, 1.1, 1.1, 0.88, 1.0, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const zoomTranslateY = interpolate(
    frame,
    [0, 35, 100, 170, 220, 270, 330, 380],
    [0, 0, -80, -30, -10, 0, -20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Show review screen vs form ──
  const showReview = frame >= 265;
  const showSuccess = frame >= 330;

  // ── Panel entrance ──
  const panelSlideY = interpolate(frame, [0, 25], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelOp = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Header ──
  const headerOp = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Mint field ──
  const mintOp = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── What happens next ──
  const whOp = interpolate(frame, [25, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Fee Distribution ──
  const feeOp = interpolate(frame, [90, 102], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const feeSlideY = interpolate(frame, [90, 102], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sliderPos = interpolate(frame, [115, 160], [0, 75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const holderPct = sliderPos * 0.95;
  const lpPct = (100 - sliderPos) * 0.95;
  const activePreset = FEE_PRESETS.reduce((best, p) =>
    Math.abs(p.value - sliderPos) < Math.abs(best.value - sliderPos)
      ? p
      : best,
  ).label;
  const presetsOp = interpolate(frame, [120, 132], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Max Holders ──
  const holdersOp = interpolate(frame, [160, 172], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const holdersSlideY = interpolate(frame, [160, 172], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const toggleOn = frame >= 193;
  const toggleSpring = spring({
    frame: frame - 193,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const selectedHolder = frame >= 213 ? 256 : 100;
  const holderSliderPos = interpolate(
    frame,
    [213, 218],
    [(100 - 100) / (512 - 100) * 100, (256 - 100) / (512 - 100) * 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Create Vault button ──
  const btnOp = interpolate(frame, [210, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const btnScale = spring({
    frame: frame - 210,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const createGlow = interpolate(frame, [255, 262, 270], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Review screen ──
  const reviewOp = interpolate(frame, [265, 278], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reviewScale = spring({
    frame: frame - 265,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const signGlow = interpolate(frame, [310, 318, 328], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Flash on sign click ──
  const flashOp = interpolate(frame, [310, 312, 320], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Success ──
  const successOp = interpolate(frame, [330, 345], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const successScale = spring({
    frame: frame - 330,
    fps,
    config: { damping: 12, stiffness: 50 },
  });

  // ── Confetti ──
  const confettiStart = 340;

  // ── Cursor fade ──
  const cursorOp = interpolate(frame, [345, 365], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Scene fade out ──
  const fadeOut = interpolate(frame, [380, 400], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Shared styles ──
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: C.muted,
    fontFamily: C.font,
    textTransform: "uppercase",
    letterSpacing: 3,
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    backgroundColor: C.card,
    padding: 20,
    marginBottom: 12,
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 500,
    color: C.muted,
    fontFamily: C.font,
    marginBottom: 6,
  };

  // ── Form view opacity (fades out when review appears) ──
  const formOp = interpolate(frame, [260, 270], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Zoom container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale}) translateY(${zoomTranslateY}px)`,
          transformOrigin: "center center",
        }}
      >
        {/* Centered panel wrapper */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            style={{
              width: 780,
              position: "relative",
              opacity: panelOp,
              transform: `translateY(${panelSlideY}px)`,
            }}
          >
            {/* ═══ Main panel ═══ */}
            <div
              style={{
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                backgroundColor: C.card,
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.3)",
                overflow: "hidden",
              }}
            >
              {/* Header bar */}
              <div
                style={{
                  opacity: headerOp,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 24px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: `${C.accent}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.accent}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.white,
                      fontFamily: C.font,
                    }}
                  >
                    Create Vault
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: C.green,
                      boxShadow: `0 0 8px ${C.green}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.green,
                      fontFamily: C.font,
                    }}
                  >
                    Mainnet
                  </span>
                </div>
              </div>

              {/* Content area */}
              <div style={{ padding: "16px 24px 20px", position: "relative" }}>
                {/* ═══ FORM VIEW ═══ */}
                <div style={{ opacity: showReview ? formOp : 1 }}>
                  {/* ─── Card: Token Information ─── */}
                  <div style={{ ...cardStyle, opacity: mintOp }}>
                    <div style={{ ...sectionLabel, marginBottom: 14 }}>
                      Token Information
                    </div>
                    <div style={fieldLabel}>Token Mint Address</div>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: `1px solid ${C.border}`,
                        backgroundColor: C.dark,
                        fontSize: 13,
                        fontWeight: 500,
                        color: C.white,
                        fontFamily: C.mono,
                        minHeight: 20,
                      }}
                    >
                      <TypeText
                        text="7xK4mP9QzW...nv1"
                        frame={frame}
                        startFrame={48}
                        endFrame={88}
                        color={C.accent}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontFamily: C.font,
                        marginTop: 10,
                      }}
                    >
                      You must be the creator of this token.
                    </div>
                  </div>

                  {/* ─── Card: What Happens Next ─── */}
                  <div style={{ ...cardStyle, opacity: whOp }}>
                    <div style={{ ...sectionLabel, marginBottom: 14 }}>
                      What happens next
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {WHAT_HAPPENS.map((s) => (
                        <div
                          key={s.num}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 8,
                              backgroundColor: `${s.color}15`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: s.color,
                              fontFamily: C.font,
                              flexShrink: 0,
                            }}
                          >
                            {s.num}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: C.font,
                              lineHeight: 1.5,
                              paddingTop: 3,
                            }}
                          >
                            {s.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ─── Card: Fee Distribution ─── */}
                  <div
                    style={{
                      ...cardStyle,
                      opacity: feeOp,
                      transform: `translateY(${feeSlideY}px)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <div style={sectionLabel}>Fee Distribution</div>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                          color: `${C.muted}99`,
                          fontFamily: C.font,
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Locked at launch
                      </span>
                    </div>

                    {/* Split bar */}
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <div
                        style={{
                          width: "100%",
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: C.dark,
                          display: "flex",
                          overflow: "visible",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: `${holderPct}%`,
                            height: "100%",
                            backgroundColor: C.green,
                            borderRadius:
                              holderPct >= 94 ? 6 : "6px 0 0 6px",
                            boxShadow:
                              holderPct > 1
                                ? `0 0 10px ${C.green}40`
                                : "none",
                          }}
                        />
                        <div
                          style={{
                            width: `${lpPct}%`,
                            height: "100%",
                            backgroundColor: C.cyan,
                            borderRadius:
                              lpPct >= 94 ? 6 : "0 6px 6px 0",
                            marginLeft: "auto",
                            boxShadow:
                              lpPct > 1
                                ? `0 0 10px ${C.cyan}40`
                                : "none",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: `${sliderPos}%`,
                            transform: "translate(-50%, -50%)",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: C.white,
                            border: `2px solid ${C.dark}`,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Labels */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: C.green,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.green,
                            fontFamily: C.font,
                          }}
                        >
                          Holders: {holderPct.toFixed(0)}%
                        </span>
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: C.cyan,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.cyan,
                            fontFamily: C.font,
                          }}
                        >
                          LP: {lpPct.toFixed(0)}%
                        </span>
                      </span>
                    </div>

                    {/* Preset pills */}
                    <div
                      style={{
                        opacity: presetsOp,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      {FEE_PRESETS.map((p) => {
                        const isActive = activePreset === p.label;
                        return (
                          <div
                            key={p.label}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: C.font,
                              backgroundColor: isActive
                                ? `${C.green}18`
                                : `${C.white}0a`,
                              color: isActive ? C.green : C.muted,
                              border: `1px solid ${isActive ? `${C.green}30` : C.border}`,
                            }}
                          >
                            {p.label}
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontFamily: C.font,
                        lineHeight: 1.4,
                      }}
                    >
                      5% platform fee deducted first. Remaining fees split
                      between direct holder distributions and PumpSwap LP.
                    </div>
                  </div>

                  {/* ─── Card: Max Holders ─── */}
                  <div
                    style={{
                      ...cardStyle,
                      opacity: holdersOp,
                      transform: `translateY(${holdersSlideY}px)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: toggleOn ? 14 : 0,
                      }}
                    >
                      <div>
                        <div style={sectionLabel}>Max Holders</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: `${C.muted}99`,
                            fontFamily: C.font,
                            marginTop: 4,
                          }}
                        >
                          {toggleOn
                            ? `Top ${selectedHolder} holders earn fees`
                            : "Default: top 100 holders earn fees"}
                        </div>
                      </div>
                      {/* Toggle */}
                      <div
                        style={{
                          position: "relative",
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: toggleOn ? C.accent : C.border,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 2,
                            left: toggleOn
                              ? 2 + 20 * toggleSpring
                              : 2,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: C.white,
                          }}
                        />
                      </div>
                    </div>

                    {/* Expanded content when toggle is ON */}
                    {toggleOn && (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: C.font,
                            }}
                          >
                            Holder limit
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              backgroundColor: `${C.accent}15`,
                              fontSize: 12,
                              fontWeight: 700,
                              color: C.accent,
                              fontFamily: C.mono,
                            }}
                          >
                            {selectedHolder}
                          </span>
                        </div>

                        {/* Preset pills */}
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginBottom: 10,
                          }}
                        >
                          {HOLDER_PRESETS.map((v) => {
                            const isActive = selectedHolder === v;
                            return (
                              <div
                                key={v}
                                style={{
                                  flex: 1,
                                  padding: "6px 0",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  fontFamily: C.font,
                                  textAlign: "center",
                                  backgroundColor: isActive
                                    ? `${C.accent}18`
                                    : `${C.white}0a`,
                                  color: isActive
                                    ? C.accent
                                    : C.muted,
                                  border: `1px solid ${isActive ? `${C.accent}30` : C.border}`,
                                }}
                              >
                                {v}
                              </div>
                            );
                          })}
                        </div>

                        {/* Range bar */}
                        <div
                          style={{
                            position: "relative",
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: C.dark,
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              width: `${holderSliderPos}%`,
                              height: "100%",
                              borderRadius: 3,
                              backgroundColor: C.accent,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: `${holderSliderPos}%`,
                              transform: "translate(-50%, -50%)",
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              backgroundColor: C.white,
                              border: `2px solid ${C.accent}`,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            fontFamily: C.font,
                          }}
                        >
                          More holders = wider distribution. Fewer = bigger
                          rewards per holder.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─── Create Vault Button ─── */}
                  <div
                    style={{
                      opacity: btnOp,
                      transform: `scale(${btnScale})`,
                      padding: "14px 0",
                      borderRadius: 14,
                      backgroundColor: C.accent,
                      textAlign: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.white,
                      fontFamily: C.font,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: `0 0 ${20 + createGlow * 40}px rgba(124,58,237,${0.15 + createGlow * 0.4})`,
                    }}
                  >
                    Create Vault
                  </div>
                </div>

                {/* ═══ REVIEW VIEW ═══ */}
                {showReview && !showSuccess && (
                  <div
                    style={{
                      position: "absolute",
                      inset: "16px 24px 20px",
                      opacity: reviewOp,
                      transform: `scale(${interpolate(reviewScale, [0, 1], [0.95, 1])})`,
                    }}
                  >
                    <div style={cardStyle}>
                      <div style={{ ...sectionLabel, marginBottom: 16 }}>
                        Review Transaction
                      </div>
                      {[
                        { label: "Token Mint", value: "7xK4mP9...nv1", mono: true },
                        { label: "Fee Sharing", value: "Will be configured" },
                        { label: "Fee Account PDA", value: "Ax7bQ2k...p9F", mono: true },
                        { label: "Token Status", value: "Bonding Curve" },
                        { label: "Instructions", value: "2 instructions" },
                      ].map((row) => (
                        <div
                          key={row.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: 10,
                            backgroundColor: `${C.dark}80`,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: C.font,
                            }}
                          >
                            {row.label}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: C.white,
                              fontFamily: row.mono ? C.mono : C.font,
                            }}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Info note */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${C.border}50`,
                        backgroundColor: `${C.dark}50`,
                        marginBottom: 16,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={`${C.muted}99`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span
                        style={{
                          fontSize: 11,
                          color: `${C.muted}aa`,
                          fontFamily: C.font,
                          lineHeight: 1.4,
                        }}
                      >
                        Your wallet may warn about an "unrecognized program"
                        — this is PumpFun's fee sharing program. Safe to
                        approve.
                      </span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <div
                        style={{
                          flex: 1,
                          padding: "14px 0",
                          borderRadius: 14,
                          border: `1px solid ${C.border}`,
                          backgroundColor: C.card,
                          textAlign: "center",
                          fontSize: 14,
                          fontWeight: 500,
                          color: C.muted,
                          fontFamily: C.font,
                        }}
                      >
                        Back
                      </div>
                      <div
                        style={{
                          flex: 2,
                          padding: "14px 0",
                          borderRadius: 14,
                          backgroundColor: C.accent,
                          textAlign: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.white,
                          fontFamily: C.font,
                          boxShadow: `0 0 ${20 + signGlow * 40}px rgba(124,58,237,${0.15 + signGlow * 0.4})`,
                        }}
                      >
                        Sign & Create Vault
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ SUCCESS VIEW ═══ */}
                {showSuccess && (
                  <div
                    style={{
                      position: "absolute",
                      inset: "16px 24px 20px",
                      opacity: successOp,
                      transform: `scale(${interpolate(successScale, [0, 1], [0.9, 1])})`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    {/* Checkmark circle */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: `${C.green}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.green}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.white,
                        fontFamily: C.font,
                        marginBottom: 8,
                      }}
                    >
                      Vault Created!
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        fontFamily: C.font,
                        marginBottom: 24,
                        maxWidth: 400,
                        lineHeight: 1.5,
                      }}
                    >
                      Fee sharing is configured. Creator fees will flow to
                      your vault automatically.
                    </div>

                    {/* PDA display */}
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 440,
                        padding: "14px 20px",
                        borderRadius: 12,
                        border: `1px solid ${C.green}15`,
                        backgroundColor: `${C.green}06`,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 2,
                          color: C.muted,
                          fontFamily: C.font,
                          marginBottom: 6,
                        }}
                      >
                        Fee Account PDA
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: C.green,
                          fontFamily: C.mono,
                          wordBreak: "break-all",
                        }}
                      >
                        Ax7bQ2kR9vPdL5mN...p9F
                      </div>
                    </div>

                    {/* Dashboard button */}
                    <div
                      style={{
                        padding: "12px 28px",
                        borderRadius: 12,
                        backgroundColor: C.accent,
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.white,
                        fontFamily: C.font,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: `0 0 20px rgba(124,58,237,0.2)`,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Go to Vault Dashboard
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Flash overlay */}
        {flashOp > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: C.white,
              opacity: flashOp,
              zIndex: 50,
            }}
          />
        )}

        {/* Confetti */}
        {frame >= confettiStart &&
          CONFETTI.map((p, i) => {
            const startF = confettiStart + p.delay;
            const t = Math.max(0, (frame - startF) / 50);
            if (t <= 0) return null;
            const px = 960 + Math.cos(p.angle) * p.speed * t;
            const py =
              540 + Math.sin(p.angle) * p.speed * t * 0.8 - 60 * t;
            const op = interpolate(
              frame,
              [startF, startF + 5, startF + 40, startF + 55],
              [0, 1, 0.8, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: px,
                  top: py,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: p.color,
                  opacity: op,
                  zIndex: 70,
                }}
              />
            );
          })}

        {/* Cursor */}
        <div style={{ opacity: cursorOp }}>
          <Cursor waypoints={DASHBOARD_WAYPOINTS} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─────────── SceneCTA (reused) ─────────── */

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const logoOp = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgPop = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 40 },
  });
  const bgCircleScale = interpolate(bgPop, [0, 1], [0, 1]);

  const urlOp = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlY = interpolate(frame, [50, 65], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoGroupOp = interpolate(frame, [75, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOp = interpolate(frame, [95, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [95, 115], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 2400,
          height: 2400,
          borderRadius: "50%",
          background: GREEN_BG,
          transform: `translate(-50%, -50%) scale(${bgCircleScale})`,
          transformOrigin: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoGroupOp,
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: logoOp,
            transform: `scale(${logoScale})`,
            marginBottom: 20,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: 90, height: 90 }}
          />
        </div>
        <div
          style={{
            opacity: urlOp,
            transform: `translateY(${urlY}px)`,
            fontSize: 19,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            fontFamily: C.font,
          }}
        >
          anvil-protocol.fun
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: textOp,
            transform: `translateY(${textY}px)`,
            fontSize: 52,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1,
          }}
        >
          Launch on Anvil
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ MAIN COMPOSITION ═══════════════════ */

export const CreateVaultVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Audio src={staticFile("bgm-vault.mp3")} volume={0.8} />

      <Sequence from={0} durationInFrames={100}>
        <SceneHook />
      </Sequence>

      <Sequence from={100} durationInFrames={60}>
        <SceneStepTitle />
      </Sequence>

      <Sequence from={160} durationInFrames={400}>
        <SceneDashboard />
      </Sequence>

      <Sequence from={560} durationInFrames={130}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
