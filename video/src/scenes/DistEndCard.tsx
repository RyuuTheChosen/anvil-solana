import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { C } from "../colors";
import { LetterReveal } from "../kinetic";
import { Background } from "../effects";
import { shimmerStyle, Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

export const DistEndCard: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);

  // Logo
  const logoOpacity = interpolate(frame, [3, 12], [0, 1], clamp);
  const logoT = Math.min(Math.max((frame - 3) / 18, 0), 1);
  const logoScale = 0.6 + easeOut(logoT) * 0.4;

  // Rings — bigger, more visible
  const ring1 = 0.92 + Math.sin(frame * 0.05) * 0.08;
  const ring2 = 0.88 + Math.sin(frame * 0.05 + 1.5) * 0.12;
  const ring3 = 0.84 + Math.sin(frame * 0.05 + 3) * 0.16;

  // CTA
  const ctaOpacity = interpolate(frame, [28, 38], [0, 1], clamp);
  const ctaY = interpolate(frame, [28, 38], [10, 0], clamp);

  // URL
  const urlOpacity = interpolate(frame, [35, 45], [0, 1], clamp);
  const shimmer = shimmerStyle(frame, 40, 20);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn }}>
      <Background />

      {/* Green glow behind logo */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}0a, transparent)`,
          opacity: interpolate(frame, [5, 25], [0, 1], clamp),
        }}
      />

      {/* Pulse rings */}
      {[
        { size: 240, scale: ring1, opacity: "15" },
        { size: 360, scale: ring2, opacity: "0c" },
        { size: 480, scale: ring3, opacity: "08" },
      ].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${r.scale})`,
            width: r.size,
            height: r.size,
            borderRadius: "50%",
            border: `1px solid ${C.green}${r.opacity}`,
            pointerEvents: "none",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo — bigger */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 24,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: 120, height: 120 }}
          />
        </div>

        {/* Brand name */}
        <div style={{ marginBottom: 14 }}>
          <LetterReveal
            text="Anvil Protocol"
            startFrame={8}
            speed={2}
            fontSize={52}
            color={C.white}
            fontWeight={800}
            style={{ justifyContent: "center" }}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
            fontSize: 20,
            color: C.muted,
            fontFamily: C.font,
            fontWeight: 400,
            marginBottom: 30,
            letterSpacing: 0.3,
          }}
        >
          Launch tokens. Reward the holders.
        </div>

        {/* URL badge */}
        <div
          style={{
            opacity: urlOpacity,
            padding: "12px 32px",
            borderRadius: 14,
            border: `1px solid ${C.green}25`,
            backgroundColor: `${C.green}06`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.green,
              fontFamily: C.mono,
              letterSpacing: 1,
            }}
          >
            anvil-protocol.fun
          </span>
          {shimmer && <div style={shimmer} />}
        </div>
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};
