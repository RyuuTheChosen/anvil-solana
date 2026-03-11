import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { Cursor } from "../Cursor";

const steps = [
  {
    num: "01",
    title: "Launch your token",
    desc: "Set name, symbol, image, and fee split. Token created on PumpFun with on-chain fee sharing.",
    color: C.green,
    colorBg: `${C.green}15`,
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Fees accumulate",
    desc: "Every trade generates creator fees. Cranker deposits them on-chain into your vault automatically.",
    color: C.accent,
    colorBg: `${C.accent}15`,
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Holders get paid",
    desc: "Merkle root published hourly. Top 100 holders claim SOL, weighted by balance and hold time.",
    color: C.cyan,
    colorBg: `${C.cyan}15`,
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section header
  const headerOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [5, 25], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Connecting line
  const lineWidth = interpolate(frame, [80, 150], [0, 100], {
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

      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.accent}08, transparent)`,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 3,
            color: C.accent,
            fontFamily: C.font,
            marginBottom: 10,
          }}
        >
          Process
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1,
          }}
        >
          How it works
        </div>
      </div>

      {/* Connecting line */}
      <div
        style={{
          position: "absolute",
          top: 310,
          left: "15%",
          right: "15%",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${C.borderLight}, transparent)`,
          clipPath: `inset(0 ${100 - lineWidth}% 0 0)`,
        }}
      />

      {/* Cards */}
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 28,
          padding: "0 80px",
        }}
      >
        {steps.map((step, i) => {
          const delay = 35 + i * 25;
          const cardScale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 80 },
          });
          const cardOpacity = interpolate(
            frame,
            [delay, delay + 15],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const cardY = interpolate(frame, [delay, delay + 20], [40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={step.num}
              style={{
                opacity: cardOpacity,
                transform: `translateY(${cardY}px) scale(${cardScale})`,
                width: 320,
                padding: 28,
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                backgroundColor: C.card,
                boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Icon + number */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: step.colorBg,
                    color: step.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    color: step.color,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: C.mono,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.num}
                </div>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: C.white,
                  fontFamily: C.font,
                  marginBottom: 8,
                }}
              >
                {step.title}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: C.muted,
                  fontFamily: C.font,
                }}
              >
                {step.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cursor */}
      <Cursor
        waypoints={[
          { frame: 60, x: 200, y: 500 },
          { frame: 100, x: 330, y: 380 },
          { frame: 130, x: 640, y: 380 },
          { frame: 160, x: 950, y: 380 },
          { frame: 200, x: 950, y: 500 },
        ]}
      />
    </AbsoluteFill>
  );
};
