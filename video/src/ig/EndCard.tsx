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
import { AnimGrid, FloatingOrbs, shimmerStyle } from "./shared";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo — slam
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

  // Brand text
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

  // Tagline — gradient text
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

  // Pulsing rings behind logo (like BeatBadge)
  const ring1Scale = 1 + Math.sin(frame * 0.1) * 0.06;
  const ring2Scale = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const ring3Scale = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const ringsOp = interpolate(frame, [10, 30], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out main content, fade in "Launch on Anvil"
  const contentFadeOut = interpolate(frame, [90, 108], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaOp = interpolate(frame, [115, 130], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaSpring = spring({
    frame: frame - 115,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [1.4, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn }}>
      <AnimGrid speed={0.15} />
      <FloatingOrbs
        orbs={[
          { x: 300, y: 300, size: 350, color: C.green, speed: 0.01, phase: 0 },
          { x: 700, y: 600, size: 300, color: C.accent, speed: 0.008, phase: 2.5 },
        ]}
      />

      {/* Dramatic radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}15, transparent 70%)`,
          opacity: glow,
        }}
      />

      {/* Pulsing concentric rings */}
      {contentFadeOut > 0 && [ring1Scale, ring2Scale, ring3Scale].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -58%) scale(${s})`,
            width: 200 + i * 80,
            height: 200 + i * 80,
            borderRadius: "50%",
            border: `1px solid ${C.green}${["10", "08", "05"][i]}`,
            boxShadow: i === 0
              ? `0 0 40px ${C.green}06, inset 0 0 40px ${C.green}04`
              : "none",
            opacity: ringsOp * contentFadeOut,
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
          opacity: contentFadeOut,
        }}
      >
        {/* Logo — slam */}
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
              width: 96,
              height: 96,
              filter: `drop-shadow(0 0 30px ${C.green}30)`,
            }}
          />
        </div>

        {/* Brand — slam */}
        <div
          style={{
            opacity: brandOp,
            transform: `scale(${brandScale})`,
            filter: `blur(${brandBlur}px)`,
            fontSize: 38,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1.5,
            marginBottom: 14,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Tagline — gradient text */}
        <div
          style={{
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            fontSize: 20,
            fontFamily: C.font,
            marginBottom: 28,
            background: `linear-gradient(135deg, ${C.text}, ${C.muted})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          your fees. your holders. your vault.
        </div>

        {/* URL badge with shimmer */}
        <div
          style={{
            opacity: urlOp,
            padding: "10px 28px",
            borderRadius: 12,
            border: `1px solid ${C.green}30`,
            backgroundColor: `${C.green}08`,
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 20px ${C.green}10`,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.green,
              fontFamily: C.mono,
              letterSpacing: 1,
            }}
          >
            anvil-protocol.fun
          </span>
          {urlShimmer && <div style={urlShimmer} />}
        </div>
      </div>

      {/* "Launch on Anvil" CTA */}
      {frame >= 110 && (
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
              fontSize: 48,
              fontWeight: 800,
              fontFamily: C.font,
              letterSpacing: -1.5,
              color: C.white,
              textShadow: `0 0 40px ${C.green}30`,
            }}
          >
            Launch on <span style={{ color: C.green }}>Anvil</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
