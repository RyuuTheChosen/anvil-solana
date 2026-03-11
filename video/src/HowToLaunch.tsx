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

/* ─────────── SceneHook (reused from PumpFunLaunch) ─────────── */

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
      <SlamText fontSize={72}>How to Launch Your Token</SlamText>
      <div
        style={{
          opacity: subtitleOp,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 28,
          fontWeight: 500,
          color: C.muted,
          fontFamily: C.font,
          marginTop: 16,
        }}
      >
        3 simple steps
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
}> = ({ text, frame, startFrame, endFrame }) => {
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
        <span style={{ color: C.green, fontWeight: 300 }}>|</span>
      )}
    </>
  );
};

/* ─────────── Step Pill ─────────── */

const StepPill: React.FC<{
  label: string;
  active: boolean;
  completed: boolean;
}> = ({ label, active, completed }) => (
  <div
    style={{
      padding: "6px 16px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: C.font,
      backgroundColor: active ? `${C.green}20` : C.dark,
      color: active ? C.green : completed ? C.greenDark : C.muted,
      border: `1px solid ${active ? `${C.green}40` : C.border}`,
    }}
  >
    {label}
  </div>
);

/* ─────────── Fee Presets ─────────── */

const FEE_PRESETS = [
  { label: "All Holders", value: 100 },
  { label: "75 / 25", value: 75 },
  { label: "50 / 50", value: 50 },
  { label: "25 / 75", value: 25 },
  { label: "All LP", value: 0 },
];

/* ─────────── SceneDashboard ─────────── */
// Local frames 0-399 (global 160-560)

const DASHBOARD_WAYPOINTS: CursorWaypoint[] = [
  { frame: 10, x: 1400, y: 950 },
  { frame: 35, x: 670, y: 500 },
  { frame: 45, x: 670, y: 450, click: true },
  { frame: 60, x: 880, y: 435 },
  { frame: 65, x: 860, y: 430 },
  { frame: 95, x: 860, y: 430 },
  { frame: 105, x: 880, y: 495 },
  { frame: 125, x: 880, y: 495 },
  { frame: 150, x: 700, y: 600 },
  { frame: 195, x: 960, y: 600 },
  { frame: 215, x: 960, y: 655 },
  { frame: 230, x: 900, y: 770 },
  { frame: 250, x: 900, y: 770 },
  { frame: 270, x: 960, y: 830 },
  { frame: 280, x: 960, y: 830, click: true },
  { frame: 310, x: 960, y: 890 },
  { frame: 330, x: 960, y: 1030 },
  { frame: 340, x: 960, y: 1030, click: true },
  { frame: 370, x: 1100, y: 750 },
];

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  angle: (i / 24) * Math.PI * 2 + i * 0.17,
  speed: 180 + (i % 6) * 70,
  color: [C.green, C.cyan, C.pink, C.white, "#ffd700", C.accent][i % 6],
  size: 4 + (i % 3) * 3,
  delay: (i % 4) * 2,
}));

const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Zoom state machine ──
  const scale = interpolate(
    frame,
    [0, 35, 135, 205, 250, 295, 380],
    [0.78, 0.88, 1.25, 1.1, 1.1, 0.88, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const zoomTranslateY = interpolate(
    frame,
    [0, 35, 135, 205, 250, 295, 380],
    [0, 0, -80, -30, -20, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Active step ──
  const activeStep = frame < 135 ? 1 : frame < 250 ? 2 : 3;

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

  // ── Step indicators ──
  const stepsOp = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Image upload ──
  const imgOp = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const imageUploaded = frame >= 48;
  const uploadFlash = interpolate(frame, [45, 48, 55], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Name field ──
  const nameOp = interpolate(frame, [20, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Symbol field ──
  const symbolOp = interpolate(frame, [28, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Fee Distribution card ──
  const feeOp = interpolate(frame, [130, 142], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const feeSlideY = interpolate(frame, [130, 142], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sliderPos = interpolate(frame, [150, 195], [0, 50], {
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
  const presetsOp = interpolate(frame, [160, 172], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Vanity mint ──
  const mintOp = interpolate(frame, [210, 222], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mintSlideY = interpolate(frame, [210, 222], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkOp = interpolate(frame, [235, 245], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Launch button ──
  const btnOp = interpolate(frame, [250, 265], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const btnScale = spring({
    frame: frame - 250,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const launchGlow = interpolate(frame, [280, 288, 300], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Flash on launch click ──
  const flashOp = interpolate(frame, [280, 282, 290], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Success card (appears after launch) ──
  const successOp = interpolate(frame, [295, 310], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const successSlideY = interpolate(frame, [295, 310], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Configure card ──
  const configOp = interpolate(frame, [310, 325], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const configSlideY = interpolate(frame, [310, 325], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const configDone = frame >= 348;
  const configGlow = interpolate(frame, [340, 348, 358], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Confetti on configure complete ──
  const confettiStart = 348;

  // ── Cursor fade after configure click ──
  const cursorOp = interpolate(frame, [342, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Scene fade out ──
  const fadeOut = interpolate(frame, [380, 400], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Shared styles matching Launch.tsx ──
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

  const fieldInput: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    backgroundColor: C.dark,
    fontSize: 14,
    fontWeight: 500,
    color: C.white,
    fontFamily: C.font,
    minHeight: 20,
  };

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
                      backgroundColor: `${C.green}15`,
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
                      stroke={C.green}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
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
                    Launch your token
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

              {/* Content */}
              <div style={{ padding: "16px 24px 20px" }}>
                {/* Step pills */}
                <div
                  style={{
                    opacity: stepsOp,
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    justifyContent: "center",
                  }}
                >
                  <StepPill
                    label="1. Details"
                    active={activeStep === 1}
                    completed={activeStep > 1}
                  />
                  <StepPill
                    label="2. Fees"
                    active={activeStep === 2}
                    completed={activeStep > 2}
                  />
                  <StepPill
                    label="3. Launch"
                    active={activeStep === 3}
                    completed={false}
                  />
                </div>

                {/* ─── Card: Token Details ─── */}
                <div style={cardStyle}>
                  <div style={{ ...sectionLabel, marginBottom: 14 }}>
                    Token Details
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {/* Image upload area */}
                    <div
                      style={{
                        opacity: imgOp,
                        transform: `scale(${imgScale})`,
                        width: 96,
                        height: 96,
                        borderRadius: 16,
                        border: imageUploaded
                          ? "none"
                          : `2px dashed ${C.borderLight}`,
                        backgroundColor: C.dark,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        overflow: "hidden",
                        position: "relative",
                        boxShadow:
                          uploadFlash > 0
                            ? `0 0 20px rgba(0,255,136,${uploadFlash * 0.3})`
                            : "none",
                      }}
                    >
                      {imageUploaded ? (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background:
                              "linear-gradient(135deg, #1a1a3e 0%, #0f3460 50%, #16213e 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.white,
                              fontFamily: C.font,
                              opacity: 0.7,
                            }}
                          >
                            MCAT
                          </span>
                        </div>
                      ) : (
                        <>
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={C.muted}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span
                            style={{
                              fontSize: 9,
                              color: C.muted,
                              fontFamily: C.font,
                              marginTop: 4,
                              fontWeight: 500,
                            }}
                          >
                            Upload
                          </span>
                        </>
                      )}
                    </div>

                    {/* Name + Symbol fields */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ opacity: nameOp }}>
                        <div style={fieldLabel}>Name</div>
                        <div style={fieldInput}>
                          <TypeText
                            text="Moon Cat"
                            frame={frame}
                            startFrame={65}
                            endFrame={95}
                          />
                        </div>
                      </div>
                      <div style={{ opacity: symbolOp }}>
                        <div style={fieldLabel}>Symbol</div>
                        <div style={fieldInput}>
                          <TypeText
                            text="MCAT"
                            frame={frame}
                            startFrame={105}
                            endFrame={125}
                          />
                        </div>
                      </div>
                    </div>
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
                  <div
                    style={{
                      position: "relative",
                      marginBottom: 10,
                    }}
                  >
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
                      {/* Thumb */}
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

                {/* ─── Vanity Mint Preview ─── */}
                <div
                  style={{
                    opacity: mintOp,
                    transform: `translateY(${mintSlideY}px)`,
                    marginBottom: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    backgroundColor: C.dark,
                    border: `1px solid ${C.borderLight}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: 4 }}>
                      Vanity Mint Address
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.white,
                        fontFamily: C.mono,
                      }}
                    >
                      7xK4mP9...
                      <span style={{ color: C.green }}>nv1</span>
                    </span>
                  </div>
                  <div
                    style={{
                      opacity: checkOp,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: `${C.green}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.green}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>

                {/* ─── Launch Button ─── */}
                <div
                  style={{
                    opacity: btnOp,
                    transform: `scale(${btnScale})`,
                    padding: "14px 0",
                    borderRadius: 14,
                    backgroundColor: C.green,
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.dark,
                    fontFamily: C.font,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: `0 0 ${20 + launchGlow * 40}px rgba(0,255,136,${0.15 + launchGlow * 0.4})`,
                  }}
                >
                  Launch Token
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ═══ Configure section (below panel, absolute) ═══ */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                paddingTop: 12,
              }}
            >
              {/* Success card */}
              {frame >= 290 && (
                <div
                  style={{
                    opacity: successOp,
                    transform: `translateY(${successSlideY}px)`,
                    borderRadius: 14,
                    border: `1px solid ${C.green}25`,
                    backgroundColor: `${C.green}0a`,
                    padding: "16px 20px",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: `${C.green}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
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
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.green,
                        fontFamily: C.font,
                        marginBottom: 4,
                      }}
                    >
                      Token created successfully!
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontFamily: C.font,
                      }}
                    >
                      Mint:{" "}
                      <span style={{ fontFamily: C.mono, color: C.white }}>
                        7xK4mP9...
                        <span style={{ color: C.green }}>nv1</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Configure / Active card */}
              {frame >= 305 && (
                <div
                  style={{
                    opacity: configOp,
                    transform: `translateY(${configSlideY}px)`,
                    borderRadius: 14,
                    border: `1px solid ${configDone ? `${C.green}25` : `${C.accent}30`}`,
                    backgroundColor: configDone
                      ? `${C.green}0a`
                      : `${C.accent}0a`,
                    padding: "16px 20px",
                    boxShadow:
                      configGlow > 0
                        ? `0 0 ${20 + configGlow * 30}px rgba(${configDone ? "0,255,136" : "124,58,237"},${0.1 + configGlow * 0.25})`
                        : "none",
                  }}
                >
                  {configDone ? (
                    /* Fee sharing active */
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Img
                        src={staticFile("logo.svg")}
                        style={{ width: 16, height: 16 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: C.green,
                          fontFamily: C.font,
                        }}
                      >
                        Anvil Protocol fee sharing is active! Creator fees
                        will be distributed to holders.
                      </span>
                    </div>
                  ) : (
                    /* Set up fee sharing */
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: `${C.accent}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Img
                            src={staticFile("logo.svg")}
                            style={{ width: 14, height: 14 }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: C.accent,
                              fontFamily: C.font,
                              marginBottom: 4,
                            }}
                          >
                            Set up Anvil fee sharing
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: C.font,
                              lineHeight: 1.4,
                            }}
                          >
                            Configure automatic creator fee distribution to
                            your token holders. One more signature required.
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "10px 0",
                          borderRadius: 10,
                          backgroundColor: `${C.accent}25`,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.accent,
                          fontFamily: C.font,
                        }}
                      >
                        Set Up Fee Sharing
                      </div>
                    </>
                  )}
                </div>
              )}
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

        {/* Confetti particles */}
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

/* ─────────── SceneCTA (reused from PumpFunLaunch) ─────────── */

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

export const HowToLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Audio src={staticFile("bgm-pump.mp3")} volume={0.8} />

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
