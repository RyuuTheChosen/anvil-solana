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
 * AI END CARD — 110 frames (~3.7s)
 * Matches IG EndCard pattern: brand → fade out → CTA slam
 */

export const AiEndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo slam
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

  // Brand slam
  const brandSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 10, stiffness: 140 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [1.8, 1]);
  const brandOp = interpolate(frame, [18, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandBlur = interpolate(frame, [18, 26], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline
  const tagOp = interpolate(frame, [32, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagY = interpolate(frame, [32, 48], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL badge
  const urlOp = interpolate(frame, [48, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlShimmer = shimmerStyle(frame, 62, 20);

  // Glow
  const glow = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing rings
  const ring1Scale = 1 + Math.sin(frame * 0.1) * 0.06;
  const ring2Scale = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const ring3Scale = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const ringsOp = interpolate(frame, [10, 30], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: fade out brand, slam CTA
  const contentFadeOut = interpolate(frame, [70, 85], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOp = interpolate(frame, [88, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaSpring = spring({
    frame: frame - 88,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [1.4, 1]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #0d0d1a 0%, ${C.dark} 70%)`, opacity: fadeIn }}>
      <AnimGrid speed={0.15} />
      <FloatingOrbs
        orbs={[
          { x: 450, y: 250, size: 550, color: C.green, speed: 0.01, phase: 0 },
          { x: 1350, y: 550, size: 480, color: C.accent, speed: 0.008, phase: 2.5 },
          { x: 250, y: 550, size: 400, color: C.cyan, speed: 0.012, phase: 4 },
          { x: 960, y: 150, size: 350, color: C.green, speed: 0.006, phase: 1.5 },
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
          background: `radial-gradient(ellipse, ${C.green}18, transparent 70%)`,
          opacity: glow,
        }}
      />

      {/* Pulsing rings */}
      {contentFadeOut > 0 &&
        [ring1Scale, ring2Scale, ring3Scale].map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -55%) scale(${s})`,
              width: 240 + i * 100,
              height: 240 + i * 100,
              borderRadius: "50%",
              border: `1px solid ${C.green}${["10", "08", "05"][i]}`,
              boxShadow:
                i === 0
                  ? `0 0 40px ${C.green}06, inset 0 0 40px ${C.green}04`
                  : "none",
              opacity: ringsOp * contentFadeOut,
            }}
          />
        ))}

      {/* Phase 1: Brand content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          zIndex: 2,
          position: "relative",
          opacity: contentFadeOut,
        }}
      >
        {/* Logo slam */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOp,
            filter: `blur(${logoBlur}px)`,
            marginBottom: 20,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{
              width: 110,
              height: 110,
              filter: `drop-shadow(0 0 30px ${C.green}30)`,
            }}
          />
        </div>

        {/* Brand slam */}
        <div
          style={{
            opacity: brandOp,
            transform: `scale(${brandScale})`,
            filter: `blur(${brandBlur}px)`,
            fontSize: 52,
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

        {/* Tagline */}
        <div
          style={{
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            fontSize: 22,
            fontFamily: C.font,
            marginBottom: 30,
            background: `linear-gradient(135deg, ${C.text}, ${C.muted})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI-powered DeFi, built into every page.
        </div>

        {/* URL badge */}
        <div
          style={{
            opacity: urlOp,
            padding: "12px 32px",
            borderRadius: 14,
            border: `1px solid ${C.green}30`,
            backgroundColor: `${C.green}08`,
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 20px ${C.green}10`,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.green,
              fontFamily: C.mono,
              letterSpacing: 1.5,
            }}
          >
            anvil-protocol.fun
          </span>
          {urlShimmer && <div style={urlShimmer} />}
        </div>
      </div>

      {/* Phase 2: CTA slam */}
      {frame >= 85 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            opacity: ctaOp,
            transform: `scale(${ctaScale})`,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              fontFamily: C.font,
              letterSpacing: -3,
              color: C.white,
              textShadow: `0 0 60px ${C.green}20, 0 4px 20px rgba(0,0,0,0.5)`,
            }}
          >
            Launch on{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Anvil
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
