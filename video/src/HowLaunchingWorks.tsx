import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { C } from "./colors";
import {
  AnimGrid,
  FloatingOrbs,
  GrainOverlay,
  ScanLines,
  Vignette,
  AmbientParticles,
  shimmerStyle,
} from "./ig/shared";

/*
 * HOW LAUNCHING WORKS — ~35s (1040 frames @ 30fps)
 *
 * Scene 0: Intro          (0-140)     — Logo + "How Launching Works"
 * Scene 1: TwoWays        (130-260)   — "Launch on the platform or tag us on X"
 * Scene 2: SideBySide     (250-490)   — Platform form (left) + X compose (right)
 * Scene 3: BehindScenes   (480-640)   — Processing pipeline
 * Scene 4: OneLiner       (630-740)   — "Our tech does everything for you behind the scenes."
 * Scene 5: RewardsLiner   (730-830)   — "Rewards are automatically sent to your holders."
 * Scene 6: Live           (820-930)   — Vault dashboard
 * Scene 7: EndCard        (920-1040)  — Logo+Anvil → URL → fade out → "Launch on [Logo] Anvil"
 */

const UI = {
  dark: "#06060b", darker: "#030308", card: "#0e0e18",
  border: "#1a1a2e", borderLight: "#252542",
  muted: "#64688a", text: "#c8cce0",
  green: "#00ff88", cyan: "#06b6d4", accent: "#7c3aed", pink: "#ec4899",
  gold: "#f59e0b", silver: "#94a3b8", bronze: "#d97706",
};

const X = {
  bg: "#000000", panel: "#16181c", border: "#2f3336",
  text: "#e7e9ea", secondary: "#71767b", blue: "#1d9bf0",
};

const CL = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/* ════════════════════════════════════════════════════════════
   SCENE 0 — INTRO (140 frames)
   ════════════════════════════════════════════════════════════ */
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 16], [0, 1], CL);
  const fadeOut = interpolate(frame, [125, 140], [1, 0], CL);
  const exitBlur = interpolate(frame, [128, 140], [0, 6], CL);

  const logoSp = spring({ frame: frame - 5, fps, config: { damping: 9, stiffness: 160, mass: 0.8 } });
  const logoScale = interpolate(logoSp, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [5, 10], [0, 1], CL);
  const logoBlur = interpolate(frame, [5, 14], [16, 0], CL);

  const brandSp = spring({ frame: frame - 20, fps, config: { damping: 10, stiffness: 140 } });
  const brandScale = interpolate(brandSp, [0, 1], [1.6, 1]);
  const brandOp = interpolate(frame, [20, 26], [0, 1], CL);
  const brandBlur = interpolate(frame, [20, 28], [8, 0], CL);

  const subOp = interpolate(frame, [30, 42], [0, 1], CL);
  const subY = interpolate(frame, [30, 42], [10, 0], CL);

  const glow = interpolate(frame, [0, 40], [0, 1], CL);
  const r1 = 1 + Math.sin(frame * 0.1) * 0.06;
  const r2 = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const r3 = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const rOp = interpolate(frame, [8, 28], [0, 0.5], CL);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`, opacity: fadeIn * fadeOut, filter: `blur(${exitBlur}px)` }}>
      <AnimGrid speed={0.15} />
      <FloatingOrbs orbs={[
        { x: 500, y: 250, size: 550, color: C.green, speed: 0.01, phase: 0 },
        { x: 1300, y: 550, size: 480, color: C.accent, speed: 0.008, phase: 2.5 },
        { x: 250, y: 500, size: 400, color: C.cyan, speed: 0.012, phase: 4 },
      ]} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 1100, height: 800, borderRadius: "50%", background: `radial-gradient(ellipse, ${C.green}15, transparent 70%)`, opacity: glow }} />
      {[r1, r2, r3].map((s, i) => (
        <div key={i} style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -55%) scale(${s})`, width: 280 + i * 120, height: 280 + i * 120, borderRadius: "50%", border: `1px solid ${C.green}${["10", "08", "05"][i]}`, boxShadow: i === 0 ? `0 0 40px ${C.green}06, inset 0 0 40px ${C.green}04` : "none", opacity: rOp }} />
      ))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", zIndex: 2, position: "relative" }}>
        <div style={{ transform: `scale(${logoScale})`, opacity: logoOp, filter: `blur(${logoBlur}px)`, marginBottom: 28 }}>
          <Img src={staticFile("logo.svg")} style={{ width: 130, height: 130, filter: `drop-shadow(0 0 24px ${C.green}30)` }} />
        </div>
        <div style={{ opacity: brandOp, transform: `scale(${brandScale})`, filter: `blur(${brandBlur}px)`, fontSize: 56, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -2.5, marginBottom: 16, textShadow: "0 2px 30px rgba(0,0,0,0.5)" }}>
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, fontSize: 26, fontFamily: C.font, letterSpacing: 0.5, background: `linear-gradient(135deg, ${C.text}, ${C.muted})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          How Launching Works
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 1 — TWO WAYS (130 frames)
   "Launch on the platform or tag us on X"
   ════════════════════════════════════════════════════════════ */
const TwoWaysScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const fadeOut = interpolate(frame, [115, 130], [1, 0], CL);
  const exitBlur = interpolate(frame, [118, 130], [0, 6], CL);

  // Title
  const titleSp = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 120 } });
  const titleScale = interpolate(titleSp, [0, 1], [1.4, 1]);
  const titleOp = interpolate(frame, [8, 16], [0, 1], CL);
  const titleBlur = interpolate(frame, [8, 16], [8, 0], CL);

  // Two cards
  const card1Sp = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 100 } });
  const card1Y = interpolate(card1Sp, [0, 1], [30, 0]);
  const card1Op = interpolate(frame, [28, 38], [0, 1], CL);

  const card2Sp = spring({ frame: frame - 42, fps, config: { damping: 14, stiffness: 100 } });
  const card2Y = interpolate(card2Sp, [0, 1], [30, 0]);
  const card2Op = interpolate(frame, [40, 50], [0, 1], CL);

  // "or" connector
  const orOp = interpolate(frame, [50, 60], [0, 1], CL);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`, opacity: fadeIn * fadeOut, filter: `blur(${exitBlur}px)` }}>
      <AnimGrid />
      <FloatingOrbs orbs={[
        { x: 300, y: 200, size: 500, color: C.green, speed: 0.01, phase: 0 },
        { x: 1400, y: 500, size: 450, color: C.accent, speed: 0.012, phase: 2.5 },
      ]} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 2 }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `scale(${titleScale})`, filter: `blur(${titleBlur}px)`, fontSize: 42, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -1.5, marginBottom: 50, textAlign: "center" as const }}>
          Two ways to launch
        </div>

        {/* Cards row */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {/* Platform card */}
          <div style={{ opacity: card1Op, transform: `translateY(${card1Y}px)`, padding: "32px 40px", borderRadius: 24, border: `1px solid ${UI.green}20`, backgroundColor: `${UI.green}06`, backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 300, boxShadow: `0 8px 40px ${UI.green}06` }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${UI.green}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile("logo.svg")} style={{ width: 32, height: 32 }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.white, fontFamily: C.font }}>Platform</span>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: C.font, textAlign: "center" as const }}>anvil-protocol.fun/launch</span>
          </div>

          {/* "or" */}
          <div style={{ opacity: orOp, fontSize: 22, fontWeight: 300, color: C.muted, fontFamily: C.font }}>or</div>

          {/* X/Twitter card */}
          <div style={{ opacity: card2Op, transform: `translateY(${card2Y}px)`, padding: "32px 40px", borderRadius: 24, border: `1px solid ${X.blue}20`, backgroundColor: `${X.blue}06`, backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 300, boxShadow: `0 8px 40px ${X.blue}06` }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: X.panel, border: `1px solid ${X.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill={X.text}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.white, fontFamily: C.font }}>Tag on X</span>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: C.font, textAlign: "center" as const }}>@AnvilProtocol launch...</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 2 — SIDE BY SIDE (240 frames)
   Platform form (left) + X compose (right)
   ════════════════════════════════════════════════════════════ */
const SideBySideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const enterBlur = interpolate(frame, [0, 12], [8, 0], CL);
  const fadeOut = interpolate(frame, [225, 240], [1, 0], CL);
  const exitBlur = interpolate(frame, [228, 240], [0, 6], CL);

  // Left panel
  const leftSp = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const leftY = interpolate(leftSp, [0, 1], [50, 0]);
  const leftOp = interpolate(frame, [5, 14], [0, 1], CL);

  // Right panel
  const rightSp = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 100 } });
  const rightY = interpolate(rightSp, [0, 1], [50, 0]);
  const rightOp = interpolate(frame, [12, 22], [0, 1], CL);

  // Typewriters — platform form
  const nameChars = Math.floor(interpolate(frame, [25, 48], [0, 5], CL)); // "Wagmi"
  const symbolChars = Math.floor(interpolate(frame, [52, 70], [0, 5], CL)); // "WAGMI"
  const sliderPct = interpolate(frame, [80, 110], [50, 75], CL);

  // Typewriter — X tweet
  const tweetText = "@AnvilProtocol launch Wagmi $WAGMI holders:200 split:75%";
  const tweetChars = Math.floor(interpolate(frame, [25, 95], [0, tweetText.length], CL));

  // Both "submit" at same time
  const submitFrame = 160;
  const submitted = frame >= submitFrame;
  const submitScale = submitted ? interpolate(frame, [submitFrame, submitFrame + 4, submitFrame + 8], [1, 0.92, 1], CL) : 1;

  const caret = Math.sin(frame * 0.4) > 0;

  const fieldLabel: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: UI.muted, fontFamily: C.font, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1.5 };
  const fieldInput: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${UI.border}`, backgroundColor: UI.dark, fontSize: 12, color: C.white, fontFamily: C.font, minHeight: 14 };

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0a0e18 0%, ${C.dark} 65%)`, opacity: fadeIn * fadeOut, filter: `blur(${enterBlur + exitBlur}px)` }}>
      <AnimGrid />
      <FloatingOrbs orbs={[
        { x: 200, y: 200, size: 480, color: C.green, speed: 0.01, phase: 1 },
        { x: 1600, y: 500, size: 420, color: C.accent, speed: 0.013, phase: 3 },
      ]} />

      {/* Centered flex wrapper for both panels */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>

        {/* ═══ LEFT: Platform Form ═══ */}
        <div style={{
          width: 500, flexShrink: 0,
          transform: `translateY(${leftY}px)`,
          borderRadius: 20, border: `1px solid ${UI.border}`, backgroundColor: UI.card,
          boxShadow: `0 8px 60px rgba(0,0,0,0.7)`, opacity: leftOp,
          padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${UI.green}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile("logo.svg")} style={{ width: 14, height: 14 }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.white, fontFamily: C.font }}>Launch your token</span>
            <div style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 6, backgroundColor: `${UI.green}10`, border: `1px solid ${UI.green}15` }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: UI.green, fontFamily: C.font }}>Platform</span>
            </div>
          </div>

          {/* Image + Name/Symbol row */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, border: `2px dashed ${UI.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: UI.dark }}>
              {frame >= 75 ? (
                <div style={{ width: "100%", height: "100%", borderRadius: 10, background: `linear-gradient(135deg, ${UI.green}, ${UI.cyan})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: UI.dark, fontFamily: C.font }}>W</span>
                </div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={UI.muted} strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              )}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={fieldLabel}>Name</div>
                <div style={fieldInput}>
                  {"Wagmi".slice(0, nameChars) || <span style={{ color: `${UI.muted}60` }}>My Token</span>}
                  {frame >= 25 && frame < 50 && caret && <span style={{ color: UI.green }}>|</span>}
                </div>
              </div>
              <div>
                <div style={fieldLabel}>Symbol</div>
                <div style={{ ...fieldInput, color: UI.green, fontWeight: 700, fontFamily: C.mono }}>
                  {"WAGMI".slice(0, symbolChars) || <span style={{ color: `${UI.muted}60`, fontWeight: 400, fontFamily: C.font }}>MTK</span>}
                  {frame >= 52 && frame < 73 && caret && <span style={{ color: UI.green }}>|</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Fee slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", ...fieldLabel, marginBottom: 5 }}>
              <span>Fee Distribution</span>
              <span style={{ color: `${UI.muted}60`, fontSize: 8, textTransform: "none", letterSpacing: 0 }}>Locked at launch</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, backgroundColor: UI.dark, display: "flex", overflow: "hidden" }}>
              <div style={{ width: `${sliderPct}%`, height: "100%", background: UI.green }} />
              <div style={{ width: `${100 - sliderPct}%`, height: "100%", background: UI.cyan }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, fontFamily: C.font }}>
              <span style={{ color: UI.green, fontWeight: 600 }}>Holders: {Math.round(sliderPct)}%</span>
              <span style={{ color: UI.cyan, fontWeight: 600 }}>LP: {Math.round(100 - sliderPct)}%</span>
            </div>
          </div>

          {/* Max holders */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 10, border: `1px solid ${UI.border}`, backgroundColor: UI.dark }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: UI.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1 }}>Max Holders</span>
            <span style={{ padding: "2px 6px", borderRadius: 5, backgroundColor: `${UI.green}15`, fontSize: 12, fontWeight: 800, color: UI.green, fontFamily: C.mono }}>200</span>
          </div>

          {/* Launch button */}
          <div style={{ position: "relative", padding: "12px 0", borderRadius: 10, background: frame >= 140 ? UI.green : `${UI.green}30`, textAlign: "center" as const, transform: `scale(${submitScale})`, overflow: "hidden", marginTop: "auto" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: frame >= 140 ? UI.dark : `${UI.green}60`, fontFamily: C.font }}>
              {submitted ? "Processing..." : "Launch Token"}
            </span>
            {shimmerStyle(frame, 145, 15) && <div style={shimmerStyle(frame, 145, 15)!} />}
          </div>
        </div>

        {/* "or" divider */}
        <div style={{ position: "relative", width: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 -50px", opacity: interpolate(frame, [18, 28], [0, 0.6], CL), zIndex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: `${C.dark}ee`, border: `1px solid ${UI.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: C.muted, fontFamily: C.font }}>or</div>
        </div>

        {/* ═══ RIGHT: X Compose ═══ */}
        <div style={{
          width: 500, flexShrink: 0, position: "relative",
          transform: `translateY(${rightY}px)`,
          borderRadius: 20, border: `1px solid ${X.border}`, backgroundColor: X.panel,
          boxShadow: `0 8px 60px rgba(0,0,0,0.7)`, opacity: rightOp,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Header bar */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${X.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: X.secondary, fontFamily: C.font }}>Cancel</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: X.blue, fontFamily: C.font }}>Drafts</span>
              <div style={{ padding: "6px 18px", borderRadius: 18, backgroundColor: frame >= 140 ? X.blue : `${X.blue}80`, transform: `scale(${submitScale})` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: C.font }}>Post</span>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div style={{ padding: "6px 16px 0", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ padding: "3px 8px", borderRadius: 6, backgroundColor: `${X.blue}10`, border: `1px solid ${X.blue}15` }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: X.blue, fontFamily: C.font }}>X / Twitter</span>
            </div>
          </div>

          {/* Compose body */}
          <div style={{ padding: "14px 16px", display: "flex", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}40, ${C.green}30)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.white, fontFamily: C.font }}>W</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5, color: X.text, fontFamily: C.font, wordBreak: "break-word" as const }}>
                {frame < 25 ? (
                  <span style={{ color: X.secondary }}>What is happening?!</span>
                ) : (
                  <TweetHighlight text={tweetText.slice(0, tweetChars)} />
                )}
                {frame >= 25 && frame < 98 && caret && <span style={{ color: X.blue, marginLeft: 1 }}>|</span>}
              </div>
              {/* Toolbar */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${X.border}`, display: "flex", gap: 14 }}>
                {["M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
                  "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                ].map((d, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={X.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d={d} /></svg>
                ))}
              </div>
            </div>
          </div>

          {/* Sending overlay */}
          {submitted && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: interpolate(frame, [submitFrame, submitFrame + 8], [0, 1], CL) }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2.5px solid ${X.blue}30`, borderTop: `2.5px solid ${X.blue}`, transform: `rotate(${frame * 12}deg)` }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: X.text, fontFamily: C.font }}>Posting...</span>
            </div>
          )}
        </div>

      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 3 — BEHIND THE SCENES (160 frames)
   Processing pipeline
   ════════════════════════════════════════════════════════════ */
const STEPS = [
  { label: "building transaction", sub: "token + metadata + instructions", color: UI.cyan },
  { label: "vanity mint assigned", sub: "address ending in nv1", color: UI.green },
  { label: "signed & submitted", sub: "sent to Solana", color: UI.accent },
  { label: "confirmed on-chain", sub: "token live", color: UI.green },
  { label: "fee sharing configured", sub: "fees → vault PDA (auto)", color: UI.cyan },
];

const BehindScenesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const enterBlur = interpolate(frame, [0, 12], [8, 0], CL);
  const fadeOut = interpolate(frame, [145, 160], [1, 0], CL);
  const exitBlur = interpolate(frame, [148, 160], [0, 6], CL);

  const stepStart = 20;
  const stepGap = 22;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #0a0e18 0%, ${C.dark} 65%)`, opacity: fadeIn * fadeOut, filter: `blur(${enterBlur + exitBlur}px)` }}>
      <AnimGrid />
      <FloatingOrbs orbs={[
        { x: 300, y: 200, size: 500, color: C.green, speed: 0.01, phase: 0 },
        { x: 1400, y: 600, size: 450, color: C.accent, speed: 0.012, phase: 2 },
      ]} />

      {/* Processing modal — centered */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 640,
        borderRadius: 24, border: `1px solid ${UI.border}`, backgroundColor: UI.card,
        boxShadow: `0 16px 80px rgba(0,0,0,0.6)`, padding: "28px 32px",
      }}>
        {/* Spinner + current step */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2.5px solid ${UI.green}30`, borderTop: `2.5px solid ${UI.green}`, transform: `rotate(${frame * 12}deg)` }} />
          {(() => {
            const idx = STEPS.reduce((acc, _, i) => (frame >= stepStart + i * stepGap ? i : acc), 0);
            return <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.font }}>{STEPS[idx]?.label ?? "processing..."}</span>;
          })()}
        </div>

        {/* Progress circles */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {STEPS.map((step, i) => {
            const d = stepStart + i * stepGap;
            const done = frame >= d + 12;
            const cur = frame >= d && !done;
            const op = interpolate(frame, [d - 3, d + 3], [0.3, 1], CL);
            return (
              <React.Fragment key={i}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: op, backgroundColor: done ? `${UI.green}20` : cur ? `${UI.green}15` : `${UI.border}50`, border: cur || done ? `2px solid ${UI.green}40` : `2px solid transparent`, boxShadow: cur ? `0 0 12px ${UI.green}15` : "none" }}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={UI.green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: cur ? UI.green : UI.muted, fontFamily: C.font }}>{i + 1}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, backgroundColor: done ? `${UI.green}30` : `${UI.border}40` }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {STEPS.map((step, i) => {
            const d = stepStart + i * stepGap;
            const done = frame >= d + 12;
            const cur = frame >= d && !done;
            return <span key={i} style={{ fontSize: 9, fontWeight: 600, color: done ? UI.green : cur ? C.white : UI.muted, fontFamily: C.font, textAlign: "center" as const, width: 110 }}>{step.label}</span>;
          })}
        </div>

        {/* Detail rows */}
        <div style={{ marginTop: 22, borderTop: `1px solid ${UI.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map((step, i) => {
            const d = stepStart + i * stepGap + 12;
            const op = interpolate(frame, [d, d + 6], [0, 1], CL);
            const x = interpolate(frame, [d, d + 8], [8, 0], CL);
            return (
              <div key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, backgroundColor: `${step.color}06`, border: `1px solid ${step.color}10` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: C.font }}>{step.label}</span>
                <span style={{ fontSize: 10, color: UI.muted, fontFamily: C.mono, marginLeft: "auto" }}>{step.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 4 — ONE LINER (110 frames)
   "Our tech does everything for you behind the scenes."
   ════════════════════════════════════════════════════════════ */
const OneLinerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const fadeOut = interpolate(frame, [95, 110], [1, 0], CL);
  const exitBlur = interpolate(frame, [98, 110], [0, 6], CL);

  const textSp = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 100 } });
  const textScale = interpolate(textSp, [0, 1], [1.3, 1]);
  const textOp = interpolate(frame, [10, 20], [0, 1], CL);
  const textBlur = interpolate(frame, [10, 20], [8, 0], CL);

  const subOp = interpolate(frame, [35, 48], [0, 1], CL);
  const subY = interpolate(frame, [35, 48], [8, 0], CL);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #0d0d1a 0%, ${C.dark} 70%)`, opacity: fadeIn * fadeOut, filter: `blur(${exitBlur}px)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <AnimGrid speed={0.1} />
      <FloatingOrbs orbs={[
        { x: 400, y: 300, size: 600, color: C.green, speed: 0.008, phase: 0 },
        { x: 1200, y: 400, size: 500, color: C.accent, speed: 0.01, phase: 2 },
      ]} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 900, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, ${C.green}10, transparent 70%)` }} />
      <div style={{ opacity: textOp, transform: `scale(${textScale})`, filter: `blur(${textBlur}px)`, fontSize: 46, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -1.5, textAlign: "center" as const, maxWidth: 850, lineHeight: 1.3 }}>
        Our tech does everything for you<br />
        <span style={{ color: C.green }}>behind the scenes.</span>
      </div>
      <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, fontSize: 18, color: C.muted, fontFamily: C.font, textAlign: "center" as const }}>
        build. sign. confirm. configure. distribute.
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 5 — REWARDS LINER (100 frames)
   "Rewards are automatically sent to your holders."
   ════════════════════════════════════════════════════════════ */
const RewardsLinerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const fadeOut = interpolate(frame, [85, 100], [1, 0], CL);
  const exitBlur = interpolate(frame, [88, 100], [0, 6], CL);

  const textSp = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 100 } });
  const textScale = interpolate(textSp, [0, 1], [1.3, 1]);
  const textOp = interpolate(frame, [10, 20], [0, 1], CL);
  const textBlur = interpolate(frame, [10, 20], [8, 0], CL);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #0d0d1a 0%, ${C.dark} 70%)`, opacity: fadeIn * fadeOut, filter: `blur(${exitBlur}px)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <AnimGrid speed={0.1} />
      <FloatingOrbs orbs={[
        { x: 500, y: 350, size: 550, color: C.green, speed: 0.009, phase: 1 },
        { x: 1100, y: 350, size: 480, color: C.cyan, speed: 0.011, phase: 3 },
      ]} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 900, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, ${C.cyan}10, transparent 70%)` }} />
      <div style={{ opacity: textOp, transform: `scale(${textScale})`, filter: `blur(${textBlur}px)`, fontSize: 46, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -1.5, textAlign: "center" as const, maxWidth: 900, lineHeight: 1.3 }}>
        Rewards are automatically sent<br />
        <span style={{ color: C.green }}>to your holders.</span>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 6 — LIVE (110 frames)
   Vault dashboard showing the result
   ════════════════════════════════════════════════════════════ */
const LiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], CL);
  const enterBlur = interpolate(frame, [0, 12], [8, 0], CL);
  const fadeOut = interpolate(frame, [95, 110], [1, 0], CL);
  const exitBlur = interpolate(frame, [98, 110], [0, 6], CL);

  const panelSp = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 90 } });
  const panelY = interpolate(panelSp, [0, 1], [40, 0]);

  const statDelay = 15;
  const allocated = interpolate(frame, [statDelay, statDelay + 25], [0, 12.45], CL);
  const distributions = Math.floor(interpolate(frame, [statDelay + 5, statDelay + 20], [0, 47], CL));
  const earners = Math.floor(interpolate(frame, [statDelay + 8, statDelay + 20], [0, 200], CL));

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #0a0e18 0%, ${C.dark} 65%)`, opacity: fadeIn * fadeOut, filter: `blur(${enterBlur + exitBlur}px)` }}>
      <AnimGrid />
      <FloatingOrbs orbs={[
        { x: 400, y: 200, size: 500, color: C.green, speed: 0.01, phase: 0 },
        { x: 1400, y: 600, size: 400, color: C.cyan, speed: 0.012, phase: 2 },
      ]} />

      {/* "Live" label */}
      <div style={{ position: "absolute", top: 36, left: "50%", transform: "translateX(-50%)", opacity: interpolate(frame, [0, 10], [0, 1], CL), display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: UI.green, boxShadow: `0 0 8px ${UI.green}` }} />
        <span style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: C.font }}>Your vault is live</span>
      </div>

      {/* Dashboard */}
      <div style={{
        position: "absolute", top: 80, left: 140, right: 140, bottom: 40,
        borderRadius: 24, border: `1px solid ${UI.border}`, backgroundColor: UI.card,
        boxShadow: `0 8px 60px rgba(0,0,0,0.7)`,
        transform: `translateY(${panelY}px)`, opacity: interpolate(frame, [5, 14], [0, 1], CL),
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${UI.green}30, transparent)` }} />

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${UI.border}50`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${UI.green}20, ${UI.accent}15)`, border: `1px solid ${UI.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.white, fontFamily: C.font }}>W</span>
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%", backgroundColor: UI.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke={UI.dark} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.white, fontFamily: C.font }}>Wagmi</div>
              <div style={{ fontSize: 10, color: UI.muted, fontFamily: C.mono }}>$WAGMI · 7sLaXk...nv1</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[{ l: "PumpFun", c: UI.green }, { l: "Axiom", c: UI.cyan }].map(b => (
              <div key={b.l} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${UI.border}`, backgroundColor: `${UI.dark}80`, fontSize: 9, fontWeight: 700, color: b.c, fontFamily: C.font }}>{b.l}</div>
            ))}
            <div style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${UI.green}15`, backgroundColor: `${UI.green}06`, display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: UI.green }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: UI.green, fontFamily: C.font }}>Active</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, padding: "12px 20px" }}>
          {[
            { label: "TOTAL ALLOCATED", value: `${allocated.toFixed(2)} SOL`, color: UI.green },
            { label: "DISTRIBUTIONS", value: `${distributions}`, color: C.white },
            { label: "TOP EARNERS", value: `${earners}`, color: C.white },
          ].map((s, i) => {
            const d = statDelay + i * 4;
            const op = interpolate(frame, [d, d + 6], [0, 1], CL);
            return (
              <div key={i} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${UI.border}50`, backgroundColor: `${UI.dark}80`, opacity: op }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: UI.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: C.mono }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        {/* Fee flow + leaderboard */}
        <div style={{ display: "flex", flex: 1, padding: "0 20px 12px", gap: 14, overflow: "hidden" }}>
          {/* Left: fee flow */}
          <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: UI.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Fee Flow</div>
            {[
              { label: "Creator Fees", sub: "100% collected", color: UI.green },
              { label: "Vault PDA", sub: "7sLa...nv1", color: UI.cyan },
              { label: "Top 200 Holders", sub: "SOL pushed directly", color: UI.green },
            ].map((node, i) => {
              const d = 20 + i * 14;
              const op = interpolate(frame, [d, d + 6], [0, 1], CL);
              return (
                <React.Fragment key={i}>
                  <div style={{ opacity: op, padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}60`, backgroundColor: `${UI.dark}60`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: `${node.color}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: node.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.white, fontFamily: C.font }}>{node.label}</div>
                      <div style={{ fontSize: 8, color: UI.muted, fontFamily: C.mono }}>{node.sub}</div>
                    </div>
                  </div>
                  {i < 2 && <div style={{ display: "flex", justifyContent: "center", opacity: op }}><div style={{ width: 2, height: 14, background: `linear-gradient(180deg, ${node.color}30, transparent)` }} /></div>}
                </React.Fragment>
              );
            })}
            {/* Split bar */}
            <div style={{ marginTop: 4, opacity: interpolate(frame, [65, 73], [0, 1], CL) }}>
              <div style={{ height: 3, borderRadius: 2, display: "flex", overflow: "hidden", backgroundColor: UI.dark }}>
                <div style={{ width: "10%", height: "100%", backgroundColor: `${UI.muted}30` }} />
                <div style={{ width: "67.5%", height: "100%", backgroundColor: UI.green }} />
                <div style={{ width: "22.5%", height: "100%", backgroundColor: UI.cyan }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 8, fontFamily: C.font }}>
                <span style={{ color: UI.muted }}>10%</span>
                <span style={{ color: UI.green }}>75%</span>
                <span style={{ color: UI.cyan }}>25%</span>
              </div>
            </div>
          </div>

          {/* Right: leaderboard */}
          <div style={{ flex: 1, borderRadius: 14, border: `1px solid ${UI.border}`, backgroundColor: UI.card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${UI.border}50`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: UI.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1.5 }}>Top Earners</span>
              <span style={{ fontSize: 8, color: UI.muted, fontFamily: C.mono }}>200 / 200</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", padding: "4px 10px", fontSize: 8, fontWeight: 700, color: UI.muted, fontFamily: C.font, textTransform: "uppercase", letterSpacing: 1 }}>
              <span>#</span><span>Wallet</span><span style={{ textAlign: "right" as const }}>Cumulative</span>
            </div>
            <div style={{ flex: 1, padding: "2px 8px", overflow: "hidden" }}>
              {[
                { rank: 1, wallet: "8kFz...m3Qp", cum: "1.2840 SOL", color: UI.gold },
                { rank: 2, wallet: "3vNx...kR7w", cum: "0.9621 SOL", color: UI.silver },
                { rank: 3, wallet: "FaS2...pL4n", cum: "0.7103 SOL", color: UI.bronze },
                { rank: 4, wallet: "9mKj...tW2x", cum: "0.4855 SOL", color: UI.muted },
                { rank: 5, wallet: "2bHc...nV8a", cum: "0.3291 SOL", color: UI.muted },
                { rank: 6, wallet: "7sLa...nv1", cum: "0.2840 SOL", color: UI.muted, you: true },
              ].map((row, i) => {
                const d = 28 + i * 3;
                const op = interpolate(frame, [d, d + 5], [0, 1], CL);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", padding: "5px 2px", borderRadius: 6, marginBottom: 1, opacity: op, backgroundColor: (row as { you?: boolean }).you ? `${UI.green}08` : "transparent", border: (row as { you?: boolean }).you ? `1px solid ${UI.green}12` : "1px solid transparent" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: row.color, fontFamily: C.mono, display: "flex", alignItems: "center", justifyContent: "center" }}>{row.rank}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 10, color: C.white, fontFamily: C.mono }}>{row.wallet}</span>
                      {(row as { you?: boolean }).you && <span style={{ padding: "0px 4px", borderRadius: 3, backgroundColor: `${UI.green}15`, fontSize: 7, fontWeight: 800, color: UI.green, fontFamily: C.font }}>YOU</span>}
                    </div>
                    <span style={{ fontSize: 10, color: UI.text, fontFamily: C.mono, textAlign: "right" as const }}>{row.cum}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 7 — END CARD (120 frames)
   Logo+"Anvil" → URL → fade both out → ease in "Launch on [Logo] Anvil"
   ════════════════════════════════════════════════════════════ */
const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOut = interpolate(frame, [110, 120], [1, 0], CL);

  // Phase 1: Logo + "Anvil" fade in (6-16)
  const logoSp = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100 } });
  const logoScale = interpolate(logoSp, [0, 1], [1.3, 1]);
  const logoIn = interpolate(frame, [6, 16], [0, 1], CL);
  const logoBlurIn = interpolate(frame, [6, 16], [6, 0], CL);

  // Phase 2: URL fades in below (22-32)
  const urlIn = interpolate(frame, [22, 32], [0, 1], CL);
  const urlY = interpolate(frame, [22, 32], [8, 0], CL);

  // Phase 3: Both fade out together (52-64)
  const phase1Out = interpolate(frame, [52, 64], [1, 0], CL);
  const phase1Blur = interpolate(frame, [52, 64], [0, 6], CL);

  const phase1Op = logoIn * phase1Out;
  const phase1BlurTotal = logoBlurIn + phase1Blur;

  // Phase 4: "Launch on [Logo] Anvil" eases in (68-80)
  const ctaSp = spring({ frame: frame - 68, fps, config: { damping: 12, stiffness: 80 } });
  const ctaScale = interpolate(ctaSp, [0, 1], [1.4, 1]);
  const ctaOp = interpolate(frame, [68, 80], [0, 1], CL);
  const ctaBlur = interpolate(frame, [68, 80], [8, 0], CL);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #0e1020 0%, ${C.dark} 70%)`, opacity: sceneOut, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <AnimGrid />
      <FloatingOrbs orbs={[
        { x: 400, y: 300, size: 600, color: C.green, speed: 0.008, phase: 0 },
        { x: 1200, y: 500, size: 500, color: C.accent, speed: 0.012, phase: 3 },
      ]} />
      {/* Phase 1+2: Logo + "Anvil" + URL — fades in then out */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${logoScale})`, opacity: phase1Op, filter: `blur(${phase1BlurTotal}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Img src={staticFile("anvil-mascot.png")} style={{ width: 64, height: 64, borderRadius: 16 }} />
          <span style={{ fontSize: 48, fontWeight: 900, fontFamily: C.font, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2 }}>Anvil</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 500, fontFamily: C.font, color: UI.muted, opacity: urlIn, transform: `translateY(${urlY}px)`, letterSpacing: 1 }}>anvil-protocol.fun</span>
      </div>
      {/* Phase 4: "Launch on [Logo] Anvil" — eases in after phase 1 gone */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${ctaScale})`, opacity: ctaOp, filter: `blur(${ctaBlur}px)`, display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" as const }}>
        <span style={{ fontSize: 52, fontWeight: 800, color: C.white, fontFamily: C.font, letterSpacing: -2 }}>Launch on</span>
        <Img src={staticFile("anvil-mascot.png")} style={{ width: 44, height: 44, borderRadius: 10 }} />
        <span style={{ fontSize: 52, fontWeight: 800, fontFamily: C.font, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2 }}>Anvil</span>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
const TweetHighlight: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(@\w+|\$\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) return <span key={i} style={{ color: X.blue }}>{part}</span>;
        if (part.startsWith("$")) return <span key={i} style={{ color: C.green, fontWeight: 700 }}>{part}</span>;
        const hl = part.replace(/(holders:\s*\d+|split:\s*\d+%?)/gi, "<<<$1>>>");
        if (hl.includes("<<<")) {
          return (
            <React.Fragment key={i}>
              {hl.split(/(<<<.*?>>>)/g).map((sub, j) =>
                sub.startsWith("<<<") ? <span key={j} style={{ color: C.cyan }}>{sub.replace(/<<<|>>>/g, "")}</span> : sub
              )}
            </React.Fragment>
          );
        }
        return part;
      })}
    </>
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPOSITION
   ════════════════════════════════════════════════════════════ */
export const HowLaunchingWorks: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <AbsoluteFill>
        <Audio src={staticFile("bgm-ai.mp3")} volume={0.4} />

        <Sequence from={0} durationInFrames={140}><IntroScene /></Sequence>
        <Sequence from={130} durationInFrames={130}><TwoWaysScene /></Sequence>
        <Sequence from={250} durationInFrames={240}><SideBySideScene /></Sequence>
        <Sequence from={480} durationInFrames={160}><BehindScenesScene /></Sequence>
        <Sequence from={630} durationInFrames={110}><OneLinerScene /></Sequence>
        <Sequence from={730} durationInFrames={100}><RewardsLinerScene /></Sequence>
        <Sequence from={820} durationInFrames={110}><LiveScene /></Sequence>
        <Sequence from={920} durationInFrames={120}><EndCardScene /></Sequence>

        {/* SFX — scene transitions */}
        {[130, 250, 480, 630, 730, 820, 920].map((f) => (
          <Sequence key={`w-${f}`} from={f} durationInFrames={20}>
            <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.2} />
          </Sequence>
        ))}
        {/* Typing */}
        <Sequence from={275} durationInFrames={70}>
          <Audio src={staticFile("sfx/type.mp3")} volume={0.12} />
        </Sequence>
        {/* Submit click */}
        <Sequence from={410} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.3} />
        </Sequence>
        {/* Step completions */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Sequence key={`s-${i}`} from={480 + 20 + i * 22 + 12} durationInFrames={15}>
            <Audio src={staticFile("sfx/pop.mp3")} volume={0.15} />
          </Sequence>
        ))}
        {/* Success */}
        <Sequence from={830} durationInFrames={30}>
          <Audio src={staticFile("sfx/success.mp3")} volume={0.25} />
        </Sequence>
      </AbsoluteFill>

      <AmbientParticles count={20} color={C.green} speed={0.7} />
      <Vignette intensity={0.6} />
      <ScanLines />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
