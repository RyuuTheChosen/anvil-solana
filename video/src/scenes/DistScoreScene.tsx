import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { MomentumSlide, LetterReveal } from "../kinetic";
import { Background } from "../effects";
import { glassCard, Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const HOLDERS = [
  { addr: "7xKp...R2mD", pct: 8.4, days: 14, mult: 2.4, score: 98.2, color: C.green },
  { addr: "3Fnw...vQ8e", pct: 6.1, days: 30, mult: 3.5, score: 94.7, color: C.green },
  { addr: "9Btx...kL4a", pct: 5.3, days: 7, mult: 1.7, score: 71.3, color: C.cyan },
  { addr: "2Wqm...pN7f", pct: 4.7, days: 60, mult: 5.0, score: 67.1, color: C.cyan },
];

export const DistScoreScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [112, 130], [1, 0], clamp);

  // Escalating text
  const words = ["hold", "longer", "→", "earn", "more"];
  const sizes = [44, 52, 36, 64, 80];
  const wordColors = [C.text, C.text, C.muted, C.green, C.green];
  const weights = [600, 600, 400, 800, 900];

  const rewardP = interpolate(frame, [68, 108], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />

      {/* Escalating words */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 18,
        }}
      >
        {words.map((word, i) => (
          <MomentumSlide
            key={i}
            text={word}
            startFrame={5 + i * 5}
            from="left"
            distance={250 + i * 30}
            duration={16}
            fontSize={sizes[i]}
            color={wordColors[i]}
            fontWeight={weights[i]}
          />
        ))}
      </div>

      {/* Formula */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <LetterReveal
          text="SCORE = balance × time"
          startFrame={32}
          speed={1.5}
          fontSize={30}
          color={C.text}
          fontFamily={C.mono}
          fontWeight={600}
        />
      </div>

      {/* Multiplier detail */}
      <div style={{ position: "absolute", top: 310, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            opacity: interpolate(frame, [52, 62], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [52, 65], [12, 0], clamp)}px)`,
            fontSize: 22,
            fontFamily: C.mono,
            color: C.cyan,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          multiplier = √(days_held / 24)
        </div>
        <div
          style={{
            opacity: interpolate(frame, [64, 74], [0, 1], clamp),
            fontSize: 16,
            fontFamily: C.font,
            color: C.muted,
            fontWeight: 400,
          }}
        >
          capped at 10×
        </div>
      </div>

      {/* Holder table */}
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 260,
          right: 260,
          ...glassCard(),
          borderRadius: 20,
          padding: "20px 28px",
          opacity: interpolate(frame, [48, 60], [0, 1], clamp),
          transform: `translateY(${interpolate(frame, [48, 60], [16, 0], clamp)}px)`,
        }}
      >
        {/* Headers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 4px 12px",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 6,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: C.muted,
            fontFamily: C.font,
          }}
        >
          <span style={{ width: 140 }}>Wallet</span>
          <span style={{ width: 80, textAlign: "right" }}>Hold %</span>
          <span style={{ width: 80, textAlign: "right" }}>Days</span>
          <span style={{ width: 80, textAlign: "right" }}>Mult</span>
          <span style={{ width: 90, textAlign: "right" }}>Score</span>
          <span style={{ flex: 1, textAlign: "right", paddingRight: 4 }}>Share</span>
        </div>

        {/* Rows */}
        {HOLDERS.map((h, i) => {
          const rowDelay = 56 + i * 7;
          const rowRel = frame - rowDelay;
          const rowT = Math.min(Math.max(rowRel / 12, 0), 1);
          const rowEased = easeOut(rowT);
          const rowX = (1 - rowEased) * 30;
          const rowOpacity = interpolate(rowRel, [0, 5], [0, 1], clamp);
          const barWidth = (h.score / 100) * 240 * rewardP;

          return (
            <div
              key={h.addr}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 4px",
                opacity: rowOpacity,
                transform: `translateX(${rowX}px)`,
                borderBottom: i < HOLDERS.length - 1 ? `1px solid ${C.border}30` : "none",
              }}
            >
              <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: C.text, fontFamily: C.mono }}>
                {h.addr}
              </span>
              <span style={{ width: 80, textAlign: "right", fontSize: 13, color: C.text, fontFamily: C.mono }}>
                {h.pct}%
              </span>
              <span style={{ width: 80, textAlign: "right", fontSize: 13, color: C.muted, fontFamily: C.mono }}>
                {h.days}d
              </span>
              <span style={{ width: 80, textAlign: "right", fontSize: 13, color: C.cyan, fontFamily: C.mono, fontWeight: 700 }}>
                {h.mult}×
              </span>
              <span style={{ width: 90, textAlign: "right", fontSize: 14, color: h.color, fontFamily: C.mono, fontWeight: 700 }}>
                {(h.score * rewardP).toFixed(1)}
              </span>
              {/* Share bar */}
              <div style={{ flex: 1, paddingLeft: 16, display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: barWidth,
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${h.color}50, ${h.color}25)`,
                    boxShadow: barWidth > 20 ? `0 0 8px ${h.color}15` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
