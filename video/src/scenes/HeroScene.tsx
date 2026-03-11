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

export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background grid fade in
  const gridOpacity = interpolate(frame, [0, 40], [0, 0.035], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background glow
  const glowOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo (frame 10)
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const logoOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Anvil Protocol" (frame 40)
  const brandOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandY = interpolate(frame, [40, 60], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Launch tokens." (frame 70)
  const line1Opacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line1Y = interpolate(frame, [70, 90], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Share the fees." (frame 95)
  const line2Opacity = interpolate(frame, [95, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Y = interpolate(frame, [95, 115], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge (frame 130)
  const badgeOpacity = interpolate(frame, [130, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeScale = spring({
    frame: frame - 130,
    fps,
    config: { damping: 200 },
  });

  // Buttons (frame 150)
  const btnOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const btnY = interpolate(frame, [150, 170], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Trust indicators (frame 180)
  const trustOpacity = interpolate(frame, [180, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: gridOpacity,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glows */}
      <div
        style={{
          position: "absolute",
          top: -150,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}0a, transparent)`,
          opacity: glowOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 50,
          right: -80,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.accent}0c, transparent)`,
          opacity: glowOpacity,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 12,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: 80, height: 80 }}
          />
        </div>

        {/* Brand name */}
        <div
          style={{
            opacity: brandOpacity,
            transform: `translateY(${brandY}px)`,
            fontSize: 22,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            marginBottom: 28,
            letterSpacing: -0.5,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              opacity: line1Opacity,
              transform: `translateY(${line1Y}px)`,
              fontSize: 56,
              fontWeight: 800,
              color: C.white,
              fontFamily: C.font,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            Launch tokens.
          </div>
          <div
            style={{
              opacity: line2Opacity,
              transform: `translateY(${line2Y}px)`,
              fontSize: 56,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: C.font,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            Share the fees.
          </div>
        </div>

        {/* Badge */}
        <div
          style={{
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 9999,
            border: `1px solid ${C.green}25`,
            backgroundColor: `${C.green}0f`,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: C.green,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.green,
              fontFamily: C.font,
            }}
          >
            Live on Solana Mainnet
          </span>
        </div>

        {/* Buttons */}
        <div
          style={{
            opacity: btnOpacity,
            transform: `translateY(${btnY}px)`,
            display: "flex",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: "12px 36px",
              borderRadius: 14,
              backgroundColor: C.green,
              color: C.dark,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: C.font,
              display: "flex",
              alignItems: "center",
              gap: 8,
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
          <div
            style={{
              padding: "12px 36px",
              borderRadius: 14,
              border: `1px solid ${C.borderLight}`,
              color: C.white,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: C.font,
            }}
          >
            Explore Tokens
          </div>
        </div>

        {/* Trust indicators */}
        <div
          style={{
            opacity: trustOpacity,
            display: "flex",
            gap: 20,
            marginTop: 32,
            fontSize: 11,
            color: C.muted,
            fontFamily: C.font,
          }}
        >
          {["On-chain program", "Merkle verified", "Non-custodial", "Hourly distributions"].map(
            (label, i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <span style={{ width: 1, height: 14, background: C.border }} />
                )}
                <span>{label}</span>
              </React.Fragment>
            )
          )}
        </div>
      </div>

      {/* Cursor */}
      <Cursor
        waypoints={[
          { frame: 170, x: 1050, y: 580 },
          { frame: 200, x: 620, y: 462 },
          { frame: 215, x: 570, y: 458, click: true },
        ]}
      />
    </AbsoluteFill>
  );
};
