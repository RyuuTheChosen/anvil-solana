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
import { C } from "./colors";
import { Background } from "./effects";
import { Vignette, GrainOverlay, ScanLines, AmbientParticles, AnimGrid, FloatingOrbs } from "./ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ─── Shared background used by intro scenes ──────────── */

const IntroBg: React.FC = () => (
  <>
    <AnimGrid speed={0.15} />
    <FloatingOrbs
      orbs={[
        { x: 500, y: 250, size: 550, color: C.green, speed: 0.01, phase: 0 },
        { x: 1300, y: 550, size: 480, color: C.accent, speed: 0.008, phase: 2.5 },
        { x: 250, y: 500, size: 400, color: C.cyan, speed: 0.012, phase: 4 },
        { x: 960, y: 200, size: 350, color: C.green, speed: 0.006, phase: 1.2 },
      ]}
    />
  </>
);

/* ═══════════════════════════════════════════
   Scene 1 — Intro: "Anvil Protocol [LOGO] Push Distribution"
   75 frames / 2.5s
   ═══════════════════════════════════════════ */

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 16], [0, 1], clamp);
  const fadeOut = interpolate(frame, [62, 75], [1, 0], clamp);
  const exitBlur = interpolate(frame, [65, 75], [0, 6], clamp);

  // "Anvil Protocol" — left side
  const leftSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.8 },
  });
  const leftScale = interpolate(leftSpring, [0, 1], [1.8, 1]);
  const leftOp = interpolate(frame, [5, 12], [0, 1], clamp);
  const leftBlur = interpolate(frame, [5, 14], [12, 0], clamp);

  // Logo — center
  const logoSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 9, stiffness: 180, mass: 0.7 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [12, 17], [0, 1], clamp);
  const logoBlur = interpolate(frame, [12, 20], [16, 0], clamp);

  // "Push Distribution" — right side
  const rightSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.8 },
  });
  const rightScale = interpolate(rightSpring, [0, 1], [1.8, 1]);
  const rightOp = interpolate(frame, [20, 27], [0, 1], clamp);
  const rightBlur = interpolate(frame, [20, 28], [12, 0], clamp);

  // Glow + rings
  const glow = interpolate(frame, [0, 40], [0, 1], clamp);
  const ring1Scale = 1 + Math.sin(frame * 0.1) * 0.06;
  const ring2Scale = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const ring3Scale = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const ringsOp = interpolate(frame, [8, 28], [0, 0.5], clamp);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`,
        opacity: fadeIn * fadeOut,
        filter: `blur(${exitBlur}px)`,
      }}
    >
      <IntroBg />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1100,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}15, transparent 70%)`,
          opacity: glow,
        }}
      />

      {/* Pulsing rings */}
      {[ring1Scale, ring2Scale, ring3Scale].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -55%) scale(${s})`,
            width: 280 + i * 120,
            height: 280 + i * 120,
            borderRadius: "50%",
            border: `1px solid ${C.green}${["10", "08", "05"][i]}`,
            boxShadow:
              i === 0
                ? `0 0 40px ${C.green}06, inset 0 0 40px ${C.green}04`
                : "none",
            opacity: ringsOp,
          }}
        />
      ))}

      {/* Horizontal row: "Anvil Protocol" [LOGO] "Push Distribution" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          height: "100%",
          zIndex: 2,
          position: "relative",
        }}
      >
        {/* Anvil Protocol */}
        <div
          style={{
            opacity: leftOp,
            transform: `scale(${leftScale})`,
            filter: `blur(${leftBlur}px)`,
            fontSize: 80,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -3,
            textShadow: `0 2px 30px rgba(0,0,0,0.5)`,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOp,
            filter: `blur(${logoBlur}px)`,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{
              width: 150,
              height: 150,
              filter: `drop-shadow(0 0 30px ${C.green}30)`,
            }}
          />
        </div>

        {/* Push Distribution */}
        <div
          style={{
            opacity: rightOp,
            transform: `scale(${rightScale})`,
            filter: `blur(${rightBlur}px)`,
            fontSize: 80,
            fontWeight: 800,
            color: C.green,
            fontFamily: C.font,
            letterSpacing: -3,
            textShadow: `0 0 40px ${C.green}25`,
          }}
        >
          Push Distribution
        </div>
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════
   Scene 2 — "NEW UPDATE" single line
   70 frames / 2.3s
   ═══════════════════════════════════════════ */

const NewUpdateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], clamp);
  const fadeOut = interpolate(frame, [55, 70], [1, 0], clamp);
  const exitBlur = interpolate(frame, [58, 70], [0, 6], clamp);

  // Single line slam
  const textSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.7 },
  });
  const textScale = interpolate(textSpring, [0, 1], [3, 1]);
  const textOp = interpolate(frame, [8, 13], [0, 1], clamp);
  const textBlur = interpolate(frame, [8, 18], [18, 0], clamp);

  // Accent line
  const lineW = interpolate(frame, [22, 42], [0, 100], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const glow = interpolate(frame, [0, 30], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`,
        opacity: fadeIn * fadeOut,
        filter: `blur(${exitBlur}px)`,
      }}
    >
      <IntroBg />

      {/* Radial glow — accent tinted */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.accent}12, transparent 70%)`,
          opacity: glow,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          zIndex: 2,
          position: "relative",
        }}
      >
        {/* NEW UPDATE — single line */}
        <div
          style={{
            opacity: textOp,
            transform: `scale(${textScale})`,
            filter: `blur(${textBlur}px)`,
            fontSize: 110,
            fontWeight: 900,
            fontFamily: C.font,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          <span style={{ color: C.white }}>NEW </span>
          <span style={{ color: C.accent }}>UPDATE</span>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: `${lineW}%`,
            maxWidth: 480,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
            marginTop: 28,
            boxShadow: `0 0 20px ${C.accent}30`,
          }}
        />
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════
   Scene 3 — Comparison: Old vs New
   ═══════════════════════════════════════════ */

const COL_W = 620;
const CARD_H = 80;
const CARD_GAP = 18;
const CARD_PAD = "18px 28px";
const CARD_RADIUS = 18;
const ICON_SIZE = 52;
const ICON_RADIUS = 14;
const ICON_SVG = 24;
const LABEL_SIZE = 22;
const ITEM_STAGGER = 14;

const oldWay = [
  { icon: "M12 8v4l3 3", label: "Wait for epoch" },
  { icon: "M9 12l2 2 4-4", label: "Check if eligible" },
  { icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3", label: "Manually claim" },
  { icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", label: "Pay gas fees" },
];

const newWay = [
  { icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8", label: "Automatic push" },
  { icon: "M22 11.08V12a10 10 0 11-5.93-9.14", label: "Every hour" },
  { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "On-chain verified" },
  { icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z", label: "Up to 512 holders" },
];

const ComparisonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], clamp);
  const fadeOut = interpolate(frame, [220, 240], [1, 0], clamp);

  // Column headers slam in
  const oldHeaderSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.8 },
  });
  const oldHeaderScale = interpolate(oldHeaderSpring, [0, 1], [2, 1]);
  const oldHeaderOp = interpolate(frame, [5, 12], [0, 1], clamp);
  const oldHeaderBlur = interpolate(frame, [5, 14], [10, 0], clamp);

  const newHeaderSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.8 },
  });
  const newHeaderScale = interpolate(newHeaderSpring, [0, 1], [2, 1]);
  const newHeaderOp = interpolate(frame, [8, 15], [0, 1], clamp);
  const newHeaderBlur = interpolate(frame, [8, 17], [10, 0], clamp);

  // VS divider
  const vsSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.6 },
  });
  const vsScale = interpolate(vsSpring, [0, 1], [4, 1]);
  const vsOp = interpolate(frame, [18, 24], [0, 1], clamp);
  const vsBlur = interpolate(frame, [18, 26], [14, 0], clamp);

  // Vertical divider line
  const divLineH = interpolate(frame, [12, 35], [0, 100], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // X crossout — two diagonal lines
  const xLine1 = interpolate(frame, [155, 170], [0, 100], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const xLine2 = interpolate(frame, [163, 178], [0, 100], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // Old side dims
  const oldDim = interpolate(frame, [155, 185], [1, 0.15], clamp);

  // Red tint on old cards
  const oldRedTint = interpolate(frame, [170, 185], [0, 1], clamp);

  // New side glows up
  const newGlow = interpolate(frame, [185, 205], [0, 1], clamp);

  // "DEPRECATED" stamp
  const stampOp = interpolate(frame, [172, 180], [0, 1], clamp);
  const stampSpring = spring({
    frame: frame - 172,
    fps,
    config: { damping: 7, stiffness: 220, mass: 0.5 },
  });
  const stampScale = interpolate(stampSpring, [0, 1], [4, 1]);
  const stampRotate = interpolate(stampSpring, [0, 1], [-20, -12]);

  // Shared card renderer
  const renderCard = (
    item: { icon: string; label: string },
    i: number,
    side: "old" | "new",
  ) => {
    const baseDelay = 30;
    const d = baseDelay + i * ITEM_STAGGER;
    const itemSpring = spring({
      frame: frame - d,
      fps,
      config: { damping: 12, stiffness: 140, mass: 0.8 },
    });
    const itemOp = interpolate(frame, [d, d + 6], [0, 1], clamp);
    const itemX = interpolate(itemSpring, [0, 1], [side === "old" ? -40 : 40, 0]);
    const isNew = side === "new";
    const isGlowing = isNew && newGlow > 0;
    const accentColor = isNew ? C.green : C.muted;

    return (
      <div
        key={i}
        style={{
          opacity: itemOp,
          transform: `translateX(${itemX}px)`,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: CARD_PAD,
          height: CARD_H,
          borderRadius: CARD_RADIUS,
          border: `1.5px solid ${isGlowing ? `${C.green}40` : C.border}`,
          backgroundColor: isGlowing ? `${C.green}0a` : `${C.card}cc`,
          boxShadow: isGlowing
            ? `0 0 30px ${C.green}15, inset 0 0 0 1px ${C.green}10`
            : `0 2px 8px rgba(0,0,0,0.3)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: ICON_RADIUS,
            backgroundColor: `${accentColor}15`,
            border: `1px solid ${accentColor}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width={ICON_SVG} height={ICON_SVG} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
        </div>
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 600,
            color: isNew ? C.white : C.text,
            fontFamily: C.font,
            letterSpacing: -0.3,
          }}
        >
          {item.label}
        </span>
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.dark,
        opacity: fadeIn * fadeOut,
      }}
    >
      <Background />
      <AmbientParticles count={18} color={C.green} speed={0.5} />

      {/* Vertical center divider line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "12%",
          bottom: "12%",
          width: 1,
          transform: "translateX(-50%)",
          background: `linear-gradient(180deg, transparent, ${C.border}60 20%, ${C.border}60 80%, transparent)`,
          clipPath: `inset(${100 - divLineH}% 0 0 0)`,
        }}
      />

      {/* Layout: two columns with VS overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* LEFT — Claim Model */}
        <div
          style={{
            width: COL_W,
            marginRight: 80,
            opacity: oldDim,
            position: "relative",
          }}
        >
          {/* Header */}
          <div
            style={{
              opacity: oldHeaderOp,
              transform: `scale(${oldHeaderScale})`,
              filter: `blur(${oldHeaderBlur}px)`,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: C.font,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: `${C.muted}90`,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            Claim Model
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP }}>
            {oldWay.map((item, i) => renderCard(item, i, "old"))}
          </div>

          {/* X crossout — line 1 */}
          {xLine1 > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: -20,
                width: "calc(100% + 40px)",
                height: "calc(100% + 40px)",
                pointerEvents: "none",
                zIndex: 5,
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line
                x1="5" y1="10" x2="95" y2="90"
                stroke={C.pink}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray={`${xLine1} ${100 - xLine1}`}
                style={{ filter: `drop-shadow(0 0 8px ${C.pink})` }}
              />
            </svg>
          )}

          {/* X crossout — line 2 */}
          {xLine2 > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: -20,
                width: "calc(100% + 40px)",
                height: "calc(100% + 40px)",
                pointerEvents: "none",
                zIndex: 5,
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line
                x1="5" y1="90" x2="95" y2="10"
                stroke={C.pink}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray={`${xLine2} ${100 - xLine2}`}
                style={{ filter: `drop-shadow(0 0 8px ${C.pink})` }}
              />
            </svg>
          )}

          {/* Red overlay tint */}
          {oldRedTint > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: 22,
                background: `radial-gradient(ellipse at center, ${C.pink}06, ${C.pink}03)`,
                border: `1px solid ${C.pink}${Math.round(oldRedTint * 15).toString(16).padStart(2, "0")}`,
                opacity: oldRedTint,
                pointerEvents: "none",
                zIndex: 4,
              }}
            />
          )}

          {/* "DEPRECATED" stamp */}
          {frame >= 172 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${stampScale}) rotate(${stampRotate}deg)`,
                opacity: stampOp,
                zIndex: 6,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  fontFamily: C.font,
                  color: C.pink,
                  letterSpacing: 10,
                  textTransform: "uppercase",
                  border: `5px solid ${C.pink}`,
                  padding: "14px 44px",
                  borderRadius: 12,
                  textShadow: `0 0 40px ${C.pink}80, 0 0 80px ${C.pink}30`,
                  boxShadow: `0 0 60px ${C.pink}30, inset 0 0 30px ${C.pink}15, 0 0 100px ${C.pink}10`,
                  whiteSpace: "nowrap",
                  backgroundColor: `${C.dark}e0`,
                  backdropFilter: "blur(8px)",
                }}
              >
                Deprecated
              </div>
            </div>
          )}
        </div>

        {/* VS — overlays the center divider */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${vsScale})`,
            opacity: vsOp,
            filter: `blur(${vsBlur}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: `${C.card}f0`,
              border: `2px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 40px rgba(0,0,0,0.5)`,
              backdropFilter: "blur(20px)",
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                fontFamily: C.font,
                color: C.muted,
                letterSpacing: 3,
              }}
            >
              VS
            </span>
          </div>
        </div>

        {/* RIGHT — Push Distribution */}
        <div
          style={{
            width: COL_W,
            marginLeft: 80,
            position: "relative",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: newHeaderOp,
              transform: `scale(${newHeaderScale})`,
              filter: `blur(${newHeaderBlur}px)`,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: C.font,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: C.green,
                textShadow: newGlow > 0 ? `0 0 20px ${C.green}50` : "none",
              }}
            >
              Push Distribution
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP }}>
            {newWay.map((item, i) => renderCard(item, i, "new"))}
          </div>

          {/* Green glow aura */}
          {newGlow > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: 30,
                background: `radial-gradient(ellipse at center, ${C.green}08, transparent 70%)`,
                opacity: newGlow,
                zIndex: -1,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Checkmark badge */}
          {newGlow > 0 && (
            <div
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                opacity: newGlow,
                width: 52,
                height: 52,
                borderRadius: "50%",
                backgroundColor: C.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 40px ${C.green}60, 0 0 80px ${C.green}20`,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════
   Scene 4 — End Card
   ═══════════════════════════════════════════ */

const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], clamp);

  // Logo
  const logoSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [5, 10], [0, 1], clamp);
  const logoBlur = interpolate(frame, [5, 14], [16, 0], clamp);

  // Brand
  const brandSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 10, stiffness: 140 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [1.8, 1]);
  const brandOp = interpolate(frame, [18, 24], [0, 1], clamp);

  // Tagline
  const tagOp = interpolate(frame, [35, 48], [0, 1], clamp);
  const tagY = interpolate(frame, [35, 48], [12, 0], clamp);

  // URL
  const urlOp = interpolate(frame, [50, 62], [0, 1], clamp);

  // Glow
  const glow = interpolate(frame, [0, 40], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn }}>
      <Background />
      <AmbientParticles count={20} color={C.green} />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}12, transparent 70%)`,
          opacity: glow,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          zIndex: 2,
          position: "relative",
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOp,
            filter: `blur(${logoBlur}px)`,
            marginBottom: 16,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{
              width: 120,
              height: 120,
              filter: `drop-shadow(0 0 30px ${C.green}30)`,
            }}
          />
        </div>

        {/* Brand */}
        <div
          style={{
            opacity: brandOp,
            transform: `scale(${brandScale})`,
            fontSize: 58,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -2.5,
            marginBottom: 18,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            fontSize: 32,
            fontFamily: C.font,
            fontWeight: 500,
            color: C.muted,
            marginBottom: 36,
          }}
        >
          push distribution. live now.
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOp,
            padding: "14px 38px",
            borderRadius: 16,
            border: `1px solid ${C.green}30`,
            backgroundColor: `${C.green}08`,
            boxShadow: `0 0 20px ${C.green}10`,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.green,
              fontFamily: C.mono,
              letterSpacing: 1,
            }}
          >
            anvil-protocol.fun
          </span>
        </div>
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════
   Main Composition
   Scene map (10-frame overlaps):
     Intro:       0–75
     NewUpdate:   65–135
     Comparison:  125–365
     EndCard:     355–445

   Total: 445 frames / 14.8s @ 30fps
   ═══════════════════════════════════════════ */

export const PushDistribution: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Sequence from={0} durationInFrames={75}>
        <IntroScene />
      </Sequence>

      <Sequence from={65} durationInFrames={70}>
        <NewUpdateScene />
      </Sequence>

      <Sequence from={125} durationInFrames={240}>
        <ComparisonScene />
      </Sequence>

      <Sequence from={355} durationInFrames={90}>
        <EndCardScene />
      </Sequence>

      <ScanLines />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
