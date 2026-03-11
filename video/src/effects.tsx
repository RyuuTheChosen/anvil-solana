import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "./colors";

/* ──────────────────── Screen Shake ──────────────────── */

/** Calculate decaying shake offset for multiple trigger frames */
export function calcShake(
  frame: number,
  triggers: number[],
  intensity = 10,
  duration = 14
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const t of triggers) {
    const rel = frame - t;
    if (rel >= 0 && rel < duration) {
      const decay = 1 - rel / duration;
      const d2 = decay * decay; // quadratic decay for snappier falloff
      x += Math.sin(rel * 17.3 + t) * intensity * d2;
      y += Math.cos(rel * 13.1 + t) * intensity * d2;
    }
  }
  return { x, y };
}

/* ──────────────────── White Flash ──────────────────── */

export const FlashOverlay: React.FC<{
  frame: number;
  triggers: number[];
  duration?: number;
}> = ({ frame, triggers, duration = 6 }) => {
  let opacity = 0;
  for (const t of triggers) {
    const rel = frame - t;
    if (rel >= 0 && rel < duration) {
      opacity = Math.max(
        opacity,
        interpolate(rel, [0, duration], [0.9, 0], {
          extrapolateRight: "clamp",
        })
      );
    }
  }
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{ backgroundColor: C.white, opacity, zIndex: 50 }}
    />
  );
};

/* ──────────────────── Slam Text ──────────────────── */

export const SlamText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  fontSize?: number;
  color?: string;
  gradient?: string;
  fontWeight?: number;
  fontFamily?: string;
}> = ({
  children,
  delay = 3,
  fontSize = 72,
  color,
  gradient,
  fontWeight = 800,
  fontFamily = C.font,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 8, stiffness: 180, mass: 0.8 },
  });

  const scale = interpolate(progress, [0, 1], [2.8, 1]);
  const opacity = interpolate(frame - delay, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(frame - delay, [0, 8], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const style: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing: fontSize > 40 ? -3 : -0.5,
    lineHeight: 1.05,
    transform: `scale(${scale})`,
    opacity,
    filter: `blur(${blur}px)`,
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  if (gradient) {
    style.background = gradient;
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
  } else {
    style.color = color || C.white;
  }

  return <div style={style}>{children}</div>;
};

/* ──────────────────── Slam Scale (for non-text elements) ──────────────────── */

export const SlamScale: React.FC<{
  children: React.ReactNode;
  delay?: number;
  from?: number;
}> = ({ children, delay = 3, from = 2.2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.8 },
  });

  const scale = interpolate(progress, [0, 1], [from, 1]);
  const opacity = interpolate(frame - delay, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(frame - delay, [0, 6], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      {children}
    </div>
  );
};

/* ──────────────────── Background ──────────────────── */

export const Background: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulse glow intensity on beats
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <>
      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Scan lines (scrolling) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.15) 2px, rgba(0,255,136,0.15) 4px)",
          backgroundSize: "100% 4px",
          backgroundPositionY: frame * 0.5,
        }}
      />
      {/* Green glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}0d, transparent)`,
          opacity: pulse,
        }}
      />
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.accent}0a, transparent)`,
          opacity: pulse * 0.7,
        }}
      />
    </>
  );
};
