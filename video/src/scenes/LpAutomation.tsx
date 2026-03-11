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

/*
 * LP AUTOMATION — 20s composition (600 frames @ 30fps)
 *
 * Scene 1: BeatTitle          (0-60, 2s)
 * Scene 2: BeatGraduation     (60-180, 4s)
 * Scene 3: BeatThreshold      (180-270, 3s)
 * Scene 4: BeatDeploySequence (270-405, 4.5s)
 * Scene 5: BeatLpLive         (405-480, 2.5s)
 * Scene 6: BeatHarvest        (480-540, 2s)
 * Scene 7: BeatClose          (540-600, 2s)
 */

const MOCK_TOKEN = { name: "Forge", symbol: "FORGE", mint: "7xKp...anvi1" };

// ── Consistent design tokens ──
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: 6, fontFamily: C.font,
};
const CARD_RADIUS = 22;
const CARD_BG = `${C.card}e0`;
const CARD_SHADOW = "0 12px 50px rgba(0,0,0,0.5)";

/* ═══════════════════ MAIN COMPOSITION ═══════════════════ */

export const LpAutomation: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <AbsoluteFill>
        <Background />

        <Sequence from={0} durationInFrames={60}>
          <BeatTitle />
        </Sequence>

        <Sequence from={60} durationInFrames={120}>
          <BeatGraduation />
        </Sequence>

        <Sequence from={180} durationInFrames={90}>
          <BeatThreshold />
        </Sequence>

        <Sequence from={270} durationInFrames={135}>
          <BeatDeploySequence />
        </Sequence>

        <Sequence from={405} durationInFrames={75}>
          <BeatLpLive />
        </Sequence>

        <Sequence from={480} durationInFrames={60}>
          <BeatHarvest />
        </Sequence>

        <Sequence from={540} durationInFrames={60}>
          <BeatClose />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 1: TITLE ═══════════════════ */

const BeatTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const titleScale = interpolate(titleProgress, [0, 1], [1.8, 1]);
  const titleOp = interpolate(frame, [5, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleBlur = interpolate(frame, [5, 16], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subOp = interpolate(frame, [20, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [20, 32], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const badgeOp = interpolate(frame, [35, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)",
        width: 700, height: 500, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.cyan}12, transparent)`,
        opacity: interpolate(frame, [0, 30], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />

      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`, filter: `blur(${titleBlur}px)`,
        fontSize: 72, fontWeight: 900, letterSpacing: -2,
        background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        fontFamily: C.font, marginBottom: 20,
      }}>
        Automated Liquidity
      </div>

      <div style={{
        opacity: subOp, transform: `translateY(${subY}px)`,
        fontSize: 22, color: C.muted, fontFamily: C.font, marginBottom: 28,
      }}>
        Your token graduates. LP deploys itself.
      </div>

      <div style={{
        opacity: badgeOp,
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 22px", borderRadius: 9999,
        border: `1px solid ${C.cyan}25`, backgroundColor: `${C.cyan}0a`,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.cyan }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>
          Powered by PumpSwap AMM
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 2: GRADUATION ═══════════════════ */

const BeatGraduation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardProgress = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 100 } });
  const cardScale = interpolate(cardProgress, [0, 1], [0.9, 1]);
  const cardOp = interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const curveProgress = interpolate(frame, [20, 75], [60, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const curveColor = curveProgress >= 100 ? C.green : C.accent;

  const gradBadgeOp = interpolate(frame, [78, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gradBadgeScale = spring({ frame: frame - 78, fps, config: { damping: 10, stiffness: 160 } });

  const crankerOp = interpolate(frame, [92, 102], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const crankerY = interpolate(frame, [92, 102], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const checkOp = interpolate(frame, [105, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...LABEL_STYLE, opacity: labelOp, color: C.muted, marginBottom: 32 }}>
        Step 1: Graduation
      </div>

      {/* Token card */}
      <div style={{
        opacity: cardOp, transform: `scale(${cardScale})`,
        width: 620, padding: "32px 36px", borderRadius: CARD_RADIUS,
        border: `1px solid ${C.border}`, backgroundColor: CARD_BG,
        boxShadow: CARD_SHADOW,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: `linear-gradient(135deg, ${C.green}30, ${C.accent}20)`,
            border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: C.white, fontFamily: C.font,
          }}>F</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.white, fontFamily: C.font }}>
              {MOCK_TOKEN.name}
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: C.mono }}>
              ${MOCK_TOKEN.symbol} · {MOCK_TOKEN.mint}
            </div>
          </div>
          <div style={{
            marginLeft: "auto",
            opacity: gradBadgeOp, transform: `scale(${interpolate(gradBadgeScale, [0, 1], [1.6, 1])})`,
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 18px", borderRadius: 9999,
            backgroundColor: `${C.green}18`, border: `1px solid ${C.green}30`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.green, boxShadow: `0 0 10px ${C.green}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green, fontFamily: C.font }}>GRADUATED</span>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, fontFamily: C.font }}>Bonding Curve</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: curveColor, fontFamily: C.mono }}>
              {curveProgress.toFixed(1)}%
            </span>
          </div>
          <div style={{
            width: "100%", height: 14, borderRadius: 7,
            backgroundColor: `${C.border}80`, overflow: "hidden",
          }}>
            <div style={{
              width: `${curveProgress}%`, height: "100%", borderRadius: 7,
              background: curveProgress >= 100
                ? `linear-gradient(90deg, ${C.green}, ${C.cyan})`
                : `linear-gradient(90deg, ${C.accent}90, ${C.accent})`,
              boxShadow: curveProgress >= 100 ? `0 0 20px ${C.green}50` : "none",
            }} />
          </div>
        </div>
      </div>

      {/* Connector line */}
      <div style={{ width: 2, height: 28, background: `linear-gradient(${C.cyan}50, ${C.cyan}20)`, margin: "6px 0", opacity: crankerOp }} />

      {/* Cranker detection */}
      <div style={{
        opacity: crankerOp, transform: `translateY(${crankerY}px)`,
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 26px", borderRadius: 16,
        border: `1px solid ${C.cyan}25`, backgroundColor: `${C.cyan}08`,
        boxShadow: `0 6px 24px rgba(0,0,0,0.3)`,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>
          Cranker detected graduation
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: checkOp, marginLeft: 6 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 3: THRESHOLD ═══════════════════ */

const BeatThreshold: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const panelProgress = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100 } });
  const panelOp = interpolate(frame, [6, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const solAmount = interpolate(frame, [14, 55], [0.32, 1.24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const meterPct = Math.min((solAmount / 1.0) * 100, 100);
  const pastThreshold = solAmount >= 1.0;

  const readyOp = pastThreshold
    ? interpolate(frame, [55, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const readyScale = spring({ frame: frame - 55, fps, config: { damping: 10, stiffness: 160 } });

  const thresholdPulse = pastThreshold ? 0.5 + Math.sin(frame * 0.15) * 0.3 : 0.3;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...LABEL_STYLE, opacity: labelOp, color: C.muted, marginBottom: 32 }}>
        Step 2: LP Threshold
      </div>

      <div style={{
        opacity: panelOp, transform: `scale(${interpolate(panelProgress, [0, 1], [0.9, 1])})`,
        width: 640, padding: "32px 36px", borderRadius: CARD_RADIUS,
        border: `1px solid ${C.border}`, backgroundColor: CARD_BG,
        boxShadow: CARD_SHADOW,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: C.font }}>Pending LP SOL</span>
          <span style={{
            fontSize: 30, fontWeight: 800, fontFamily: C.mono,
            color: pastThreshold ? C.green : C.white,
          }}>
            {solAmount.toFixed(4)} SOL
          </span>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{
            width: "100%", height: 18, borderRadius: 9,
            backgroundColor: `${C.border}60`, overflow: "hidden",
          }}>
            <div style={{
              width: `${Math.min(meterPct, 100)}%`, height: "100%", borderRadius: 9,
              background: pastThreshold
                ? `linear-gradient(90deg, ${C.cyan}, ${C.green})`
                : `linear-gradient(90deg, ${C.cyan}80, ${C.cyan})`,
              boxShadow: pastThreshold ? `0 0 24px ${C.green}40` : `0 0 12px ${C.cyan}20`,
            }} />
          </div>
          <div style={{
            position: "absolute", top: -6, left: "100%", transform: "translateX(-100%)",
            display: "flex", flexDirection: "column", alignItems: "flex-end",
          }}>
            <div style={{
              width: 2, height: 30, backgroundColor: C.green,
              opacity: thresholdPulse, boxShadow: `0 0 8px ${C.green}60`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.mono, marginTop: 3 }}>
              1.0 SOL
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
            Min threshold for LP deployment
          </span>
          <div style={{
            opacity: readyOp, transform: `scale(${interpolate(readyScale, [0, 1], [1.4, 1])})`,
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 18px", borderRadius: 9999,
            backgroundColor: `${C.green}15`, border: `1px solid ${C.green}30`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green, fontFamily: C.font }}>Ready to Deploy</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 4: DEPLOY SEQUENCE ═══════════════════ */

const deploySteps = [
  { num: "01", title: "Withdraw SOL", desc: "Pull LP funds from vault", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", color: C.green },
  { num: "02", title: "Buy Tokens", desc: "49% swap via PumpSwap", icon: "M23 6L13.5 15.5 8.5 10.5 1 18", color: C.accent },
  { num: "03", title: "Deposit to AMM", desc: "Dual-sided LP on PumpSwap", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: C.cyan },
];

const BeatDeploySequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...LABEL_STYLE, opacity: labelOp, color: C.accent, marginBottom: 40 }}>
        Step 3: LP Deployment
      </div>

      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {deploySteps.map((step, i) => {
          const delay = 10 + i * 32;

          const cardProgress = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120 } });
          const cardOp = interpolate(frame - delay, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const cardY = interpolate(cardProgress, [0, 1], [25, 0]);

          const spinStart = delay + 10;
          const spinOp = interpolate(frame, [spinStart, spinStart + 4, spinStart + 18, spinStart + 22], [0, 0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const checkFrame = delay + 24;
          const checkProgress = spring({ frame: frame - checkFrame, fps, config: { damping: 10, stiffness: 200 } });
          const checkOp = interpolate(frame - checkFrame, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const arrowOp = i < 2
            ? interpolate(frame, [delay + 26, delay + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;

          const completedGlow = checkOp > 0
            ? interpolate(checkProgress, [0, 1], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;

          return (
            <React.Fragment key={step.num}>
              <div style={{
                opacity: cardOp, transform: `translateY(${cardY}px)`,
                width: 280, padding: "28px 26px", borderRadius: CARD_RADIUS,
                backgroundColor: CARD_BG,
                border: `1px solid ${step.color}${checkOp > 0 ? "30" : "15"}`,
                boxShadow: `${CARD_SHADOW}, 0 0 ${completedGlow > 0 ? 30 : 0}px ${step.color}${completedGlow > 0 ? "20" : "00"}`,
                position: "relative",
                display: "flex", flexDirection: "column",
              }}>
                {/* Step number badge */}
                <div style={{
                  position: "absolute", top: -12, left: 22,
                  padding: "3px 12px", borderRadius: 8,
                  backgroundColor: `${step.color}20`, border: `1px solid ${step.color}30`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: step.color, fontFamily: C.mono }}>{step.num}</span>
                </div>

                {/* Icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  backgroundColor: `${step.color}12`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, marginTop: 6,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={step.icon} />
                  </svg>
                </div>

                <div style={{ fontSize: 19, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 5 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
                  {step.desc}
                </div>

                {/* Status — pinned to bottom */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, height: 24, marginTop: "auto", paddingTop: 18 }}>
                  {spinOp > 0 && checkOp <= 0 && (
                    <div style={{ opacity: spinOp, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: `2px solid ${step.color}30`, borderTop: `2px solid ${step.color}`,
                        transform: `rotate(${frame * 12}deg)`,
                      }} />
                      <span style={{ fontSize: 12, color: step.color, fontFamily: C.font }}>Processing...</span>
                    </div>
                  )}
                  {checkOp > 0 && (
                    <div style={{
                      opacity: checkOp, transform: `scale(${interpolate(checkProgress, [0, 1], [1.5, 1])})`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.green, fontFamily: C.font }}>Complete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow connector — self-centering */}
              {i < 2 && (
                <div style={{ opacity: arrowOp, width: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 5: LP LIVE ═══════════════════ */

const BeatLpLive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelProgress = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 100 } });
  const panelOp = interpolate(frame, [5, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const stats = [
    { label: "Pool", value: "PumpSwap AMM", mono: false, color: C.white },
    { label: "SOL Deposited", value: "1.24 SOL", mono: true, color: C.cyan },
    { label: "LP Tokens", value: "12,847", mono: true, color: C.white },
    { label: "Status", value: "Active", mono: false, color: C.green },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        opacity: panelOp, transform: `scale(${interpolate(panelProgress, [0, 1], [0.85, 1])})`,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Pulsing rings + checkmark */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            position: "absolute", width: 160, height: 160, borderRadius: "50%",
            border: `1px solid ${C.cyan}15`,
            transform: `scale(${1 + Math.sin(frame * 0.08) * 0.06})`,
          }} />
          <div style={{
            position: "absolute", width: 210, height: 210, borderRadius: "50%",
            border: `1px solid ${C.cyan}0a`,
            transform: `scale(${1 + Math.sin(frame * 0.08 + 1.5) * 0.08})`,
          }} />
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.cyan}20, ${C.green}15)`,
            border: `2px solid ${C.cyan}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${C.cyan}15`,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 36, fontWeight: 800, color: C.white, fontFamily: C.font, marginBottom: 8 }}>
          LP Deployed
        </div>
        <div style={{ fontSize: 16, color: C.muted, fontFamily: C.font, marginBottom: 32 }}>
          ${MOCK_TOKEN.symbol} is now earning LP fees on PumpSwap
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 18 }}>
          {stats.map((s, i) => {
            const delay = 18 + i * 5;
            const sOp = interpolate(frame - delay, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={s.label} style={{
                opacity: sOp,
                width: 200, padding: "18px 22px", borderRadius: 16,
                backgroundColor: CARD_BG, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 2, color: C.muted, fontFamily: C.font, marginBottom: 8 }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: s.color,
                  fontFamily: s.mono ? C.mono : C.font,
                }}>
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 6: HARVEST ═══════════════════ */

const BeatHarvest: React.FC = () => {
  const frame = useCurrentFrame();

  const labelOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const centerOp = interpolate(frame, [6, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const leftOp = interpolate(frame, [18, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const leftX = interpolate(frame, [18, 26], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const rightOp = interpolate(frame, [24, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightX = interpolate(frame, [24, 32], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...LABEL_STYLE, opacity: labelOp, color: C.green, marginBottom: 40 }}>
        Continuous Harvesting
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {/* Holders (70%) */}
        <div style={{
          opacity: leftOp, transform: `translateX(${leftX}px)`,
          width: 280, padding: "28px 30px", borderRadius: CARD_RADIUS,
          backgroundColor: CARD_BG, border: `1px solid ${C.green}20`,
          boxShadow: CARD_SHADOW, textAlign: "center" as const,
        }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: C.green, fontFamily: C.mono, marginBottom: 6 }}>70%</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 6 }}>
            To Holders
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
            Added to vault pool
          </div>
        </div>

        {/* Left arrow */}
        <div style={{ opacity: leftOp, width: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        {/* Center: LP Fees */}
        <div style={{
          opacity: centerOp,
          width: 220, padding: "28px 24px", borderRadius: CARD_RADIUS,
          background: `linear-gradient(135deg, ${C.cyan}15, ${C.accent}10)`,
          border: `1px solid ${C.cyan}30`,
          boxShadow: `${CARD_SHADOW}, 0 0 24px ${C.cyan}08`,
          textAlign: "center" as const,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px" }}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 4 }}>
            LP Fees
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
            Every 6 hours
          </div>
        </div>

        {/* Right arrow */}
        <div style={{ opacity: rightOp, width: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        {/* Compound (30%) */}
        <div style={{
          opacity: rightOp, transform: `translateX(${rightX}px)`,
          width: 280, padding: "28px 30px", borderRadius: CARD_RADIUS,
          backgroundColor: CARD_BG, border: `1px solid ${C.cyan}20`,
          boxShadow: CARD_SHADOW, textAlign: "center" as const,
        }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: C.cyan, fontFamily: C.mono, marginBottom: 6 }}>30%</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 6 }}>
            Auto-Compound
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
            Back into LP position
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ SCENE 7: CTA CLOSE ═══════════════════ */

const BeatClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame: frame - 3, fps, config: { damping: 15, stiffness: 60 }, durationInFrames: 50 });
  const logoScale = interpolate(logoProgress, [0, 1], [0.6, 1]);
  const logoOp = interpolate(frame, [3, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const brandOp = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brandY = interpolate(frame, [12, 22], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagOp = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [28, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const glow = interpolate(frame, [3, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 600, height: 500, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.green}15, transparent)`,
        opacity: glow,
      }} />

      <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 20 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 110, height: 110 }} />
      </div>

      <div style={{
        opacity: brandOp, transform: `translateY(${brandY}px)`,
        fontSize: 42, fontWeight: 800, color: C.white, fontFamily: C.font,
        letterSpacing: -1.5, marginBottom: 12,
      }}>
        Anvil<span style={{ color: C.green }}> Protocol</span>
      </div>

      <div style={{
        opacity: tagOp, fontSize: 20, color: C.muted, fontFamily: C.font, marginBottom: 26,
      }}>
        Liquidity on autopilot.
      </div>

      <div style={{
        opacity: urlOp,
        padding: "12px 32px", borderRadius: 14,
        border: `1px solid ${C.green}30`, backgroundColor: `${C.green}08`,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.green, fontFamily: C.mono, letterSpacing: 1 }}>
          anvil-protocol.fun
        </span>
      </div>
    </AbsoluteFill>
  );
};
