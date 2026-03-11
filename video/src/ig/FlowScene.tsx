import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { AnimGrid, FloatingOrbs, glassCard } from "./shared";

const nodes = [
  {
    title: "Creator Fees",
    stat: "100%",
    sub: "Every trade generates fees",
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    color: C.green,
  },
  {
    title: "Anvil Vault",
    stat: "On-chain",
    sub: "Aggregated automatically",
    icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
    color: C.accent,
  },
  {
    title: "Platform Fee",
    stat: "5%",
    sub: "Anvil protocol fee",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    color: C.pink,
  },
  {
    title: "Top Holders",
    stat: "512",
    sub: "Paid via Merkle proof",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    color: C.cyan,
  },
];

// More particles with glow variation
const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  speed: 0.006 + (i % 4) * 0.004,
  offset: (i / 24) * Math.PI * 2,
  size: 2 + (i % 3) * 2,
  segment: i < 8 ? 0 : i < 16 ? 1 : 2,
  glow: i % 3 === 0,
}));

export const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterBlur = interpolate(frame, [0, 14], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [140, 159], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title — slam
  const titleSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 8, stiffness: 180, mass: 0.8 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [2.2, 1]);
  const titleOp = interpolate(frame, [3, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleBlur = interpolate(frame, [3, 12], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Node animations — slam style with stagger
  const nodeAnimations = nodes.map((_, i) => {
    const delay = 25 + i * 18;
    const sp = spring({
      frame: frame - delay,
      fps,
      config: { damping: 9, stiffness: 160, mass: 0.8 },
    });
    return {
      opacity: interpolate(frame - delay, [0, 5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      scale: interpolate(sp, [0, 1], [2, 1]),
      blur: interpolate(frame - delay, [0, 8], [12, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      y: interpolate(sp, [0, 1], [30, 0]),
    };
  });

  // Connecting lines — animated gradient
  const line1Progress = interpolate(frame, [35, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Progress = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line3Progress = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stat3Value = interpolate(frame, [80, 120], [0, 512], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particlesVisible = frame >= 65;

  const cardWidth = 210;
  const cardGap = 36;
  const totalWidth = cardWidth * 4 + cardGap * 3;
  const startX = (1080 - totalWidth) / 2;
  const cardY = 350;

  // Bottom text slam
  const bottomSpring = spring({
    frame: frame - 95,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const bottomScale = interpolate(bottomSpring, [0, 1], [1.5, 1]);
  const bottomOp = interpolate(frame, [95, 102], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bottomBlur = interpolate(frame, [95, 105], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.dark,
        opacity: fadeIn * fadeOut,
        filter: `blur(${enterBlur}px)`,
      }}
    >
      <AnimGrid speed={0.2} />
      <FloatingOrbs
        orbs={[
          { x: 100, y: 300, size: 350, color: C.green, speed: 0.012, phase: 0 },
          { x: 800, y: 500, size: 300, color: C.accent, speed: 0.015, phase: 2 },
          { x: 500, y: 800, size: 280, color: C.cyan, speed: 0.01, phase: 4.5 },
        ]}
      />

      {/* Title — slam entrance */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOp,
          transform: `scale(${titleScale})`,
          filter: `blur(${titleBlur}px)`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 6,
            color: C.accent,
            fontFamily: C.font,
            marginBottom: 10,
          }}
        >
          How It Works
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1,
          }}
        >
          Fee Flow Pipeline
        </div>
      </div>

      {/* Connecting lines with gradient glow */}
      {/* Line 1 */}
      <div
        style={{
          position: "absolute",
          top: cardY + 85,
          left: startX + cardWidth,
          width: cardGap * line1Progress,
          height: 2,
          background: `linear-gradient(90deg, ${C.green}50, ${C.accent}50)`,
          boxShadow: `0 0 8px ${C.green}20`,
        }}
      />
      {line1Progress > 0.9 && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            position: "absolute",
            top: cardY + 80,
            left: startX + cardWidth + cardGap - 10,
            opacity: (line1Progress - 0.9) / 0.1,
          }}
        >
          <path d="M0 0L10 5L0 10Z" fill={`${C.accent}70`} />
        </svg>
      )}

      {/* Line 2 */}
      <div
        style={{
          position: "absolute",
          top: cardY + 85,
          left: startX + cardWidth * 2 + cardGap,
          width: cardGap * line2Progress,
          height: 2,
          background: `linear-gradient(90deg, ${C.accent}50, ${C.cyan}50)`,
          boxShadow: `0 0 8px ${C.accent}20`,
        }}
      />
      {line2Progress > 0.9 && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            position: "absolute",
            top: cardY + 80,
            left: startX + cardWidth * 2 + cardGap * 2 - 10,
            opacity: (line2Progress - 0.9) / 0.1,
          }}
        >
          <path d="M0 0L10 5L0 10Z" fill={`${C.pink}70`} />
        </svg>
      )}

      {/* Line 3 */}
      <div
        style={{
          position: "absolute",
          top: cardY + 85,
          left: startX + cardWidth * 3 + cardGap * 2,
          width: cardGap * line3Progress,
          height: 2,
          background: `linear-gradient(90deg, ${C.pink}50, ${C.cyan}50)`,
          boxShadow: `0 0 8px ${C.pink}20`,
        }}
      />
      {line3Progress > 0.9 && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            position: "absolute",
            top: cardY + 80,
            left: startX + cardWidth * 3 + cardGap * 3 - 10,
            opacity: (line3Progress - 0.9) / 0.1,
          }}
        >
          <path d="M0 0L10 5L0 10Z" fill={`${C.cyan}70`} />
        </svg>
      )}

      {/* Particles with glow */}
      {particlesVisible &&
        particles.map((p) => {
          const progress =
            ((frame - 65) * p.speed + p.offset / (Math.PI * 2)) % 1;
          const segStartX =
            p.segment === 0
              ? startX + cardWidth
              : p.segment === 1
              ? startX + cardWidth * 2 + cardGap
              : startX + cardWidth * 3 + cardGap * 2;
          const px = segStartX + cardGap * progress;
          const py =
            cardY + 85 + Math.sin(progress * Math.PI * 2 + p.offset) * 6;
          const pOpacity = Math.sin(progress * Math.PI) * (p.glow ? 0.9 : 0.5);
          const color = p.segment === 0 ? C.green : p.segment === 1 ? C.pink : C.cyan;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                backgroundColor: color,
                opacity: pOpacity,
                boxShadow: p.glow
                  ? `0 0 ${p.size * 3}px ${color}60`
                  : "none",
                filter: p.size > 4 ? "blur(1px)" : "none",
              }}
            />
          );
        })}

      {/* Node cards — glassmorphism with slam entrance */}
      {nodes.map((node, i) => {
        const anim = nodeAnimations[i];
        const cardX = startX + i * (cardWidth + cardGap);

        // Icon pulse
        const iconPulse = 0.7 + Math.sin(frame * 0.08 + i * 2) * 0.3;

        return (
          <div
            key={node.title}
            style={{
              position: "absolute",
              top: cardY,
              left: cardX,
              width: cardWidth,
              opacity: anim.opacity,
              transform: `translateY(${anim.y}px) scale(${anim.scale})`,
              filter: `blur(${anim.blur}px)`,
              padding: "28px 24px",
              borderRadius: 20,
              ...glassCard(`${node.color}20`),
              textAlign: "center",
            }}
          >
            {/* Icon with glow */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: `${node.color}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: `0 0 ${20 * iconPulse}px ${node.color}15`,
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke={node.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={node.icon} />
              </svg>
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: C.white,
                fontFamily: C.font,
                marginBottom: 8,
              }}
            >
              {node.title}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: node.color,
                fontFamily: C.mono,
                marginBottom: 8,
                lineHeight: 1,
                textShadow: `0 0 20px ${node.color}30`,
              }}
            >
              {i === 3 ? Math.round(stat3Value) : node.stat}
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.muted,
                fontFamily: C.font,
                lineHeight: 1.5,
              }}
            >
              {node.sub}
            </div>
          </div>
        );
      })}

      {/* Bottom text — slam */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: bottomOp,
          transform: `scale(${bottomScale})`,
          filter: `blur(${bottomBlur}px)`,
        }}
      >
        <span
          style={{
            fontSize: 16,
            color: C.muted,
            fontFamily: C.font,
          }}
        >
          Fully automated. Non-custodial. On-chain verified.
        </span>
      </div>
    </AbsoluteFill>
  );
};
