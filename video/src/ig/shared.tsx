import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { C } from "../colors";

/** Film grain overlay — SVG noise that shifts per frame */
export const GrainOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 90,
        pointerEvents: "none",
        opacity: 0.045,
        mixBlendMode: "overlay",
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id={`grain-${frame % 8}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="4"
            seed={Math.floor(frame * 0.5) % 8}
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${frame % 8})`}
        />
      </svg>
    </div>
  );
};

/** Scrolling grid background with parallax */
export const AnimGrid: React.FC<{ speed?: number }> = ({ speed = 0.3 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: -20,
        opacity: 0.04,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        backgroundPosition: `0 ${frame * speed}px`,
      }}
    />
  );
};

/** Scrolling scan lines */
export const ScanLines: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.02,
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.12) 2px, rgba(0,255,136,0.12) 4px)",
        backgroundSize: "100% 4px",
        backgroundPositionY: frame * 0.5,
        pointerEvents: "none",
        zIndex: 80,
      }}
    />
  );
};

/** Floating ambient orbs that drift organically */
export const FloatingOrbs: React.FC<{
  orbs?: { x: number; y: number; size: number; color: string; speed: number; phase: number }[];
}> = ({ orbs: customOrbs }) => {
  const frame = useCurrentFrame();
  const orbs = customOrbs || [
    { x: 150, y: 250, size: 300, color: C.green, speed: 0.015, phase: 0 },
    { x: 800, y: 700, size: 350, color: C.accent, speed: 0.012, phase: 2.5 },
    { x: 550, y: 100, size: 250, color: C.cyan, speed: 0.02, phase: 4.2 },
  ];

  return (
    <>
      {orbs.map((orb, i) => {
        const dx = Math.sin(frame * orb.speed + orb.phase) * 25;
        const dy = Math.cos(frame * orb.speed * 0.7 + orb.phase) * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: orb.x + dx,
              top: orb.y + dy,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(ellipse, ${orb.color}12, transparent 70%)`,
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/** Cinematic vignette — dark edges for depth */
export const Vignette: React.FC<{ intensity?: number }> = ({
  intensity = 0.7,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 70,
      pointerEvents: "none",
      background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
    }}
  />
);

/** Ambient floating particles for atmosphere */
export const AmbientParticles: React.FC<{
  count?: number;
  color?: string;
  speed?: number;
}> = ({ count = 30, color = "#00ff88", speed = 1 }) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 137.508) % 100), // golden angle distribution
        y: ((i * 61.803) % 100),
        size: 1.5 + (i % 4) * 0.8,
        phase: i * 2.39,
        drift: 0.3 + (i % 5) * 0.15,
        twinkleSpeed: 0.08 + (i % 3) * 0.04,
      })),
    [count]
  );

  return (
    <>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.008 * speed + p.phase) * 2.5;
        const y = p.y + Math.cos(frame * 0.006 * speed + p.phase) * 2;
        const twinkle =
          0.15 + Math.sin(frame * p.twinkleSpeed + p.phase) * 0.15;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: twinkle,
              boxShadow: `0 0 ${p.size * 3}px ${color}40`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/** Glassmorphism card style */
export const glassCard = (extraBorder?: string): React.CSSProperties => ({
  backgroundColor: "rgba(17, 17, 24, 0.65)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: `1px solid ${extraBorder || "rgba(255,255,255,0.06)"}`,
  boxShadow:
    "0 4px 12px rgba(0,0,0,0.2), 0 12px 28px rgba(0,0,0,0.25), 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
});

/** Shimmer sweep effect — returns a background overlay style */
export function shimmerStyle(
  frame: number,
  start: number,
  duration: number
): React.CSSProperties | null {
  if (frame < start || frame > start + duration) return null;
  const progress = interpolate(frame, [start, start + duration], [-30, 130], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    position: "absolute" as const,
    inset: 0,
    borderRadius: "inherit",
    background: `linear-gradient(105deg, transparent ${progress - 15}%, rgba(255,255,255,0.06) ${progress}%, transparent ${progress + 15}%)`,
    pointerEvents: "none" as const,
  };
}
