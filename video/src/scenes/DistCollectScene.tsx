import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { MomentumSlide, WordCascade } from "../kinetic";
import { Background } from "../effects";
import { glassCard, FloatingOrbs, Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const NODES = [
  { label: "PumpFun", sub: "Creator fees", color: C.pink, icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  { label: "Fee Account", sub: "Aggregated", color: C.accent, icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  { label: "Vault Pool", sub: "On-chain", color: C.green, icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
];

const CASCADE_WORDS = ["creator", "fees", "flow", "into", "your", "vault"];
const CASCADE_COLORS = [C.text, C.green, C.text, C.text, C.text, C.green];

export const DistCollectScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [100, 120], [1, 0], clamp);

  const particlesVisible = frame >= 50;
  const particles = React.useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        speed: 0.007 + (i % 4) * 0.003,
        offset: (i / 20) * Math.PI * 2,
        size: 2 + (i % 3),
        segment: i < 10 ? 0 : 1,
        glow: i % 3 === 0,
      })),
    []
  );

  // Centered pipeline
  const nodeY = 560;
  const nodeW = 180;
  const nodeGap = 100;
  const totalPipeW = nodeW * 3 + nodeGap * 2;
  const pipeStartX = (1920 - totalPipeW) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />
      <FloatingOrbs
        orbs={[
          { x: 200, y: 300, size: 350, color: C.pink, speed: 0.01, phase: 0 },
          { x: 1500, y: 600, size: 300, color: C.green, speed: 0.013, phase: 3 },
        ]}
      />

      {/* "COLLECT" slides in from left */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <MomentumSlide
          text="COLLECT"
          startFrame={5}
          from="left"
          distance={600}
          duration={24}
          fontSize={140}
          color={C.white}
          fontWeight={900}
          style={{ letterSpacing: -6, textAlign: "center", display: "inline-block" }}
        />
      </div>

      {/* Subtitle cascade */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <WordCascade
          words={CASCADE_WORDS}
          startFrame={22}
          stagger={3}
          fontSize={34}
          fontWeight={500}
          color={C.text}
          colors={CASCADE_COLORS}
          inline
          gap={12}
          style={{ justifyContent: "center" }}
        />
      </div>

      {/* Pipeline nodes */}
      {NODES.map((node, i) => {
        const nodeDelay = 38 + i * 12;
        const rel = frame - nodeDelay;
        const t = Math.min(Math.max(rel / 18, 0), 1);
        const eased = easeOut(t);
        const y = (1 - eased) * 25;
        const opacity = interpolate(rel, [0, 8], [0, 1], clamp);
        const x = pipeStartX + i * (nodeW + nodeGap);

        return (
          <div
            key={node.label}
            style={{
              position: "absolute",
              top: nodeY + y,
              left: x,
              width: nodeW,
              opacity,
              ...glassCard(`${node.color}18`),
              borderRadius: 20,
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: `${node.color}10`,
                border: `1px solid ${node.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <svg
                width="22"
                height="22"
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
                fontSize: 15,
                fontWeight: 700,
                color: C.white,
                fontFamily: C.font,
                marginBottom: 4,
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: C.muted,
                fontFamily: C.font,
              }}
            >
              {node.sub}
            </div>
          </div>
        );
      })}

      {/* Connecting lines between nodes */}
      {[0, 1].map((seg) => {
        const lineDelay = 52 + seg * 16;
        const progress = interpolate(frame, [lineDelay, lineDelay + 18], [0, 1], clamp);
        const x1 = pipeStartX + seg * (nodeW + nodeGap) + nodeW;
        const x2 = pipeStartX + (seg + 1) * (nodeW + nodeGap);
        const lineColor = NODES[seg].color;
        const nextColor = NODES[seg + 1].color;

        return (
          <React.Fragment key={seg}>
            <div
              style={{
                position: "absolute",
                top: nodeY + 50,
                left: x1,
                width: (x2 - x1) * progress,
                height: 2,
                background: `linear-gradient(90deg, ${lineColor}50, ${nextColor}50)`,
                boxShadow: `0 0 10px ${lineColor}15`,
              }}
            />
            {progress > 0.85 && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                style={{
                  position: "absolute",
                  top: nodeY + 45,
                  left: x2 - 10,
                  opacity: (progress - 0.85) / 0.15,
                }}
              >
                <path d="M0 0L10 5L0 10Z" fill={`${nextColor}70`} />
              </svg>
            )}
          </React.Fragment>
        );
      })}

      {/* Particles along lines */}
      {particlesVisible &&
        particles.map((p) => {
          const progress =
            ((frame - 52) * p.speed + p.offset / (Math.PI * 2)) % 1;
          const seg = p.segment;
          const x1 = pipeStartX + seg * (nodeW + nodeGap) + nodeW;
          const x2 = pipeStartX + (seg + 1) * (nodeW + nodeGap);
          const px = x1 + (x2 - x1) * progress;
          const py = nodeY + 50 + Math.sin(progress * Math.PI * 2 + p.offset) * 4;
          const pOpacity = Math.sin(progress * Math.PI) * (p.glow ? 0.7 : 0.4);
          const color = seg === 0 ? C.pink : C.green;

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
                boxShadow: p.glow ? `0 0 ${p.size * 4}px ${color}50` : undefined,
              }}
            />
          );
        })}

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
