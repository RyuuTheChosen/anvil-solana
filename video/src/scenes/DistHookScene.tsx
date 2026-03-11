import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { C } from "../colors";
import { GravityDrop } from "../kinetic";
import { Background } from "../effects";
import { FloatingOrbs, Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const WORDS = [
  { text: "Where", size: 64, color: C.muted },
  { text: "do", size: 56, color: C.muted },
  { text: "the", size: 56, color: C.muted },
  { text: "fees", size: 140, color: C.green },
  { text: "go?", size: 72, color: C.white },
];

const STAGGER = 7;
const WORD_START = 10;

export const DistHookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);
  const fadeOut = interpolate(frame, [80, 100], [1, 0], clamp);

  // After all words land, smoothly compress and drift up
  const allLanded = WORD_START + WORDS.length * STAGGER + 14;
  const compressT = Math.min(Math.max((frame - allLanded) / 25, 0), 1);
  const compressEased = easeOut(compressT);

  // Smooth gap and scale reduction — no flex direction swap
  const gap = 8 - compressEased * 2;
  const groupY = compressEased * -80;
  const groupScale = 1 - compressEased * 0.2;
  const groupOpacity = 1 - compressEased * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />
      <FloatingOrbs
        orbs={[
          { x: 300, y: 350, size: 400, color: C.green, speed: 0.01, phase: 0 },
          { x: 1400, y: 500, size: 350, color: C.accent, speed: 0.012, phase: 2 },
        ]}
      />

      {/* Stacked words — smooth compress + drift */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap,
          transform: `translateY(${groupY}px) scale(${groupScale})`,
          opacity: groupOpacity,
        }}
      >
        {WORDS.map((w, i) => (
          <GravityDrop
            key={i}
            text={w.text}
            startFrame={WORD_START + i * STAGGER}
            fontSize={w.size}
            color={w.color}
            dropDistance={50}
            duration={14}
            style={{
              textAlign: "center",
              textShadow:
                w.text === "fees" ? `0 0 60px ${C.green}25` : undefined,
            }}
          />
        ))}
      </div>

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};
