import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { CounterType } from "../kinetic";
import { Background } from "../effects";
import { Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const SPLITS = [
  { label: "PLATFORM", pct: 10, color: C.pink, targetX: 0, targetY: -180 },
  { label: "HOLDERS", pct: 45, color: C.green, targetX: -300, targetY: 100 },
  { label: "LIQUIDITY", pct: 45, color: C.cyan, targetX: 300, targetY: 100 },
];

export const DistSplitScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [130, 150], [1, 0], clamp);

  const driftStart = 40;
  const driftDuration = 28;

  // Bar
  const barStart = 75;
  const barProgress = interpolate(frame, [barStart, barStart + 28], [0, 1], clamp);
  const barEased = easeOut(barProgress);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />

      {/* Center: drifting words */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", width: 900, height: 500 }}>
          {SPLITS.map((split, i) => {
            const wordStart = 8 + i * 10;
            const wordRel = frame - wordStart;

            // Entrance: fade + slide up
            const enterT = Math.min(Math.max(wordRel / 16, 0), 1);
            const enterEased = easeOut(enterT);
            const enterY = (1 - enterEased) * 40;
            const enterOpacity = interpolate(wordRel, [0, 8], [0, 1], clamp);

            // Drift apart
            const driftRel = frame - driftStart;
            const driftT = Math.min(Math.max(driftRel / driftDuration, 0), 1);
            const driftEased = easeOut(driftT);
            const driftX = driftEased * split.targetX;
            const driftY = driftEased * split.targetY;

            // Stack position
            const stackY = (i - 1) * 80;

            // Counter appears after drift settles
            const counterStart = driftStart + 15 + i * 4;
            const counterOpacity = interpolate(frame, [counterStart, counterStart + 10], [0, 1], clamp);

            return (
              <div
                key={split.label}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) translate(${driftX}px, ${stackY + enterY + driftY}px)`,
                  opacity: enterOpacity,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 68,
                    fontWeight: 900,
                    fontFamily: C.font,
                    color: split.color,
                    letterSpacing: -3,
                    lineHeight: 1,
                    textShadow: `0 0 40px ${split.color}15`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {split.label}
                </div>

                {/* Counter below word */}
                <div style={{ opacity: counterOpacity, height: 36 }}>
                  <CounterType
                    target={split.pct}
                    startFrame={counterStart}
                    duration={18}
                    suffix="%"
                    fontSize={32}
                    color={split.color}
                    fontFamily={C.mono}
                    fontWeight={700}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horizontal stacked bar */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 240,
          right: 240,
          opacity: interpolate(frame, [barStart - 5, barStart + 8], [0, 1], clamp),
        }}
      >
        {/* Bar */}
        <div
          style={{
            height: 40,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            display: "flex",
          }}
        >
          {SPLITS.map((split, i) => {
            const width = split.pct * barEased;
            return (
              <div
                key={split.label}
                style={{
                  width: `${width}%`,
                  height: "100%",
                  backgroundColor: `${split.color}25`,
                  borderRight: i < SPLITS.length - 1 ? `1px solid ${C.dark}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {width > 10 && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: split.color,
                      fontFamily: C.mono,
                      opacity: barEased,
                      whiteSpace: "nowrap",
                      letterSpacing: 0.5,
                    }}
                  >
                    {split.pct}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels below bar segments */}
        <div style={{ display: "flex", marginTop: 10 }}>
          {SPLITS.map((split) => (
            <div
              key={split.label}
              style={{
                width: `${split.pct}%`,
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: `${split.color}90`,
                fontFamily: C.font,
                letterSpacing: 1,
                textTransform: "uppercase",
                opacity: barEased,
              }}
            >
              {split.label}
            </div>
          ))}
        </div>
      </div>

      {/* Particle streams */}
      {frame >= 42 &&
        SPLITS.map((split, si) =>
          Array.from({ length: 5 }, (_, pi) => {
            const speed = 0.01 + (pi % 3) * 0.004;
            const progress = ((frame - 42) * speed + (pi / 5) * Math.PI * 2) % 1;
            const dx = split.targetX * progress;
            const dy = (split.targetY + (si - 1) * 80) * progress;
            const opacity = Math.sin(progress * Math.PI) * 0.35;
            const size = 2 + (pi % 2);

            return (
              <div
                key={`${si}-${pi}`}
                style={{
                  position: "absolute",
                  top: `calc(50% + ${dy}px)`,
                  left: `calc(50% + ${dx}px)`,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: split.color,
                  opacity,
                  boxShadow: `0 0 ${size * 3}px ${split.color}30`,
                  pointerEvents: "none",
                }}
              />
            );
          })
        )}

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
