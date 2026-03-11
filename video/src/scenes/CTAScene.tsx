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

const FormField: React.FC<{
  label: string;
  value: string;
  opacity: number;
  y: number;
  typingProgress: number;
}> = ({ label, value, opacity, y, typingProgress }) => {
  const visibleChars = Math.floor(typingProgress * value.length);
  const displayValue = value.substring(0, visibleChars);
  const showCaret = typingProgress > 0 && typingProgress < 1;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 280,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.muted,
          fontFamily: C.font,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: `1px solid ${C.borderLight}`,
          backgroundColor: `${C.card}`,
          fontSize: 14,
          fontWeight: 500,
          color: C.white,
          fontFamily: C.font,
          minHeight: 20,
        }}
      >
        {displayValue}
        {showCaret && (
          <span style={{ color: C.green, fontWeight: 300 }}>|</span>
        )}
      </div>
    </div>
  );
};

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Button appears (0-40)
  const btnScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const btnOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle
  const subOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Click happens at frame 55
  const clickGlow = interpolate(frame, [55, 65, 80], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Form fields appear (70-120)
  const field1Opacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field1Y = interpolate(frame, [70, 85], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field2Opacity = interpolate(frame, [80, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field2Y = interpolate(frame, [80, 95], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Typing
  const typing1 = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const typing2 = interpolate(frame, [100, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: Success (140-170)
  const successOpacity = interpolate(frame, [140, 155], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const successScale = spring({
    frame: frame - 140,
    fps,
    config: { damping: 10, stiffness: 60 },
  });
  // Fade out the form
  const formFade = interpolate(frame, [135, 145], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 4: Final CTA (175-240)
  const finalOpacity = interpolate(frame, [175, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalLogoScale = spring({
    frame: frame - 175,
    fps,
    config: { damping: 200 },
  });
  const finalTaglineOpacity = interpolate(frame, [195, 215], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalUrlOpacity = interpolate(frame, [210, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success checkmark fades out
  const successFade = interpolate(frame, [170, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Overall: btn+form fade
  const btnFormOpacity = interpolate(frame, [165, 175], [1, 0], {
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
          opacity: 0.035,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glows */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}${frame > 50 ? "0c" : "06"}, transparent)`,
        }}
      />

      {/* Phase 1-2: Button + Form (fades out for final) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: btnFormOpacity,
        }}
      >
        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            fontSize: 16,
            color: C.muted,
            fontFamily: C.font,
            marginBottom: 20,
          }}
        >
          Create your token with built-in revenue sharing
        </div>

        {/* Big Launch Button */}
        <div
          style={{
            opacity: btnOpacity,
            transform: `scale(${btnScale})`,
            padding: "18px 56px",
            borderRadius: 18,
            backgroundColor: C.green,
            color: C.dark,
            fontSize: 20,
            fontWeight: 700,
            fontFamily: C.font,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 0 ${30 + clickGlow * 40}px rgba(0, 255, 136, ${0.15 + clickGlow * 0.35})`,
            marginBottom: 30,
          }}
        >
          Launch Token
          <svg
            width="18"
            height="18"
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

        {/* Form fields */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: formFade,
          }}
        >
          <FormField
            label="Token Name"
            value="Moon Cat"
            opacity={field1Opacity}
            y={field1Y}
            typingProgress={typing1}
          />
          <FormField
            label="Symbol"
            value="MCAT"
            opacity={field2Opacity}
            y={field2Y}
            typingProgress={typing2}
          />
        </div>

        {/* Success checkmark */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${successScale})`,
            opacity: successOpacity * successFade,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: `${C.green}20`,
              border: `2px solid ${C.green}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
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
      </div>

      {/* Phase 4: Final CTA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: finalOpacity,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${finalLogoScale})`,
            marginBottom: 16,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: 96, height: 96 }}
          />
        </div>

        {/* Brand */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            marginBottom: 12,
            letterSpacing: -1,
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: finalTaglineOpacity,
            fontSize: 20,
            color: C.muted,
            fontFamily: C.font,
            marginBottom: 24,
          }}
        >
          Launch tokens. Share the fees.
        </div>

        {/* URL */}
        <div
          style={{
            opacity: finalUrlOpacity,
            padding: "8px 24px",
            borderRadius: 10,
            border: `1px solid ${C.green}30`,
            backgroundColor: `${C.green}0a`,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.green,
              fontFamily: C.mono,
              letterSpacing: 0.5,
            }}
          >
            anvilprotocol.com
          </span>
        </div>
      </div>

      {/* Cursor (only during interactive phase) */}
      <Cursor
        waypoints={[
          { frame: 30, x: 800, y: 500 },
          { frame: 50, x: 640, y: 360 },
          { frame: 55, x: 620, y: 350, click: true },
          { frame: 80, x: 520, y: 430 },
          { frame: 100, x: 580, y: 440 },
          { frame: 125, x: 750, y: 440 },
          { frame: 140, x: 800, y: 500 },
        ]}
      />
    </AbsoluteFill>
  );
};
