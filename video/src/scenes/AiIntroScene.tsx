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
 * AI INTRO — 75 frames (2.5s)
 * Anvil Logo × AI Mascot side by side, then subtitle
 */

export const AiIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [62, 75], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [65, 75], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo slam (left)
  const logoSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [5, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [5, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "×" connector
  const xOp = interpolate(frame, [14, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const xScale = spring({
    frame: frame - 14,
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  // Mascot slam (right) — same effect as logo
  const mascotSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const mascotScale = interpolate(mascotSpring, [0, 1], [2.5, 1]);
  const mascotOp = interpolate(frame, [5, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mascotBlur = interpolate(frame, [5, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Brand text
  const brandSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 10, stiffness: 140 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [1.6, 1]);
  const brandOp = interpolate(frame, [24, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandBlur = interpolate(frame, [24, 32], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle
  const subOp = interpolate(frame, [34, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [34, 46], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow
  const glow = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing rings
  const ring1Scale = 1 + Math.sin(frame * 0.1) * 0.06;
  const ring2Scale = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const ring3Scale = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const ringsOp = interpolate(frame, [8, 28], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`,
        opacity: fadeIn * fadeOut,
        filter: `blur(${exitBlur}px)`,
      }}
    >
      <AnimGrid speed={0.15} />
      <FloatingOrbs
        orbs={[
          { x: 500, y: 250, size: 550, color: C.green, speed: 0.01, phase: 0 },
          { x: 1300, y: 550, size: 480, color: C.accent, speed: 0.008, phase: 2.5 },
          { x: 250, y: 500, size: 400, color: C.cyan, speed: 0.012, phase: 4 },
          { x: 960, y: 200, size: 350, color: C.green, speed: 0.006, phase: 1.2 },
        ]}
      />

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
        {/* Logo × Mascot row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 28,
          }}
        >
          {/* Anvil Logo */}
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
                width: 130,
                height: 130,
                filter: `drop-shadow(0 0 24px ${C.green}30)`,
              }}
            />
          </div>

          {/* × */}
          <div
            style={{
              opacity: xOp,
              transform: `scale(${interpolate(xScale, [0, 1], [1.8, 1])})`,
              fontSize: 36,
              fontWeight: 300,
              color: C.muted,
              fontFamily: C.font,
            }}
          >
            ×
          </div>

          {/* AI Mascot */}
          <div
            style={{
              transform: `scale(${mascotScale})`,
              opacity: mascotOp,
              filter: `blur(${mascotBlur}px)`,
            }}
          >
            <Img
              src={staticFile("anvil-mascot.png")}
              style={{
                width: 130,
                height: 130,
                borderRadius: 28,
                filter: `drop-shadow(0 0 24px ${C.cyan}30)`,
              }}
            />
          </div>
        </div>

        {/* Brand */}
        <div
          style={{
            opacity: brandOp,
            transform: `scale(${brandScale})`,
            filter: `blur(${brandBlur}px)`,
            fontSize: 56,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -2.5,
            marginBottom: 16,
            textShadow: `0 2px 30px rgba(0,0,0,0.5)`,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOp,
            transform: `translateY(${subY}px)`,
            fontSize: 24,
            fontFamily: C.font,
            letterSpacing: 0.5,
            background: `linear-gradient(135deg, ${C.text}, ${C.muted})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Introducing the AI Layer
        </div>
      </div>
    </AbsoluteFill>
  );
};
