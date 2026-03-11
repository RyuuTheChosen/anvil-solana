import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { MomentumSlide, Typewriter } from "../kinetic";
import { Background } from "../effects";
import { Vignette, glassCard } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const WALLET_GRID = Array.from({ length: 21 }, (_, i) => ({
  col: i % 7,
  row: Math.floor(i / 7),
  id: i,
}));

const BATCH_COUNT = 3;
const BATCH_SIZE = 7;
const BATCH_START = 50;
const BATCH_STAGGER = 22;

export const DistPushScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [112, 130], [1, 0], clamp);

  // Grid layout — pulled inward
  const gridX = 1060;
  const gridY = 280;
  const dotSpacing = 52;

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />

      {/* Left: "PUSH" + batch list */}
      <div style={{ position: "absolute", top: 160, left: 140, width: 760 }}>
        <MomentumSlide
          text="PUSH"
          startFrame={5}
          from="bottom"
          distance={160}
          duration={18}
          fontSize={160}
          color={C.white}
          fontWeight={900}
          style={{ letterSpacing: -8 }}
        />

        {/* Batch list */}
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: BATCH_COUNT }, (_, i) => {
            const batchFrame = BATCH_START + i * BATCH_STAGGER;
            const rel = frame - batchFrame;
            const enterT = Math.min(Math.max(rel / 12, 0), 1);
            const enterEased = easeOut(enterT);
            const y = (1 - enterEased) * 24;
            const opacity = interpolate(rel, [0, 5], [0, 1], clamp);
            const checkOpacity = interpolate(rel, [12, 18], [0, 1], clamp);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity,
                  transform: `translateY(${y}px)`,
                  padding: "8px 16px",
                  borderRadius: 10,
                  backgroundColor: checkOpacity > 0.5 ? `${C.green}06` : "transparent",
                  border: `1px solid ${checkOpacity > 0.5 ? `${C.green}12` : "transparent"}`,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: C.mono,
                    color: C.text,
                    width: 140,
                    letterSpacing: -0.5,
                  }}
                >
                  batch {i + 1}
                </span>
                {/* SVG check instead of unicode */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.green}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: checkOpacity }}
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            );
          })}
        </div>

        {/* "21 wallets per batch" */}
        <div style={{ marginTop: 28 }}>
          <Typewriter
            text="21 wallets per batch"
            startFrame={BATCH_START + BATCH_COUNT * BATCH_STAGGER + 5}
            speed={2}
            fontSize={22}
            color={C.muted}
            fontFamily={C.mono}
            fontWeight={500}
          />
        </div>

        {/* "direct to your wallet" */}
        <div
          style={{
            marginTop: 18,
            opacity: interpolate(frame, [110, 120], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [110, 120], [10, 0], clamp)}px)`,
            fontSize: 32,
            fontWeight: 700,
            fontFamily: C.font,
            color: C.green,
            letterSpacing: -1,
          }}
        >
          direct to your wallet
        </div>
      </div>

      {/* Wallet dot grid */}
      <div
        style={{
          position: "absolute",
          left: gridX,
          top: gridY,
          opacity: interpolate(frame, [28, 40], [0, 1], clamp),
        }}
      >
        {/* Vault pool source icon */}
        <div
          style={{
            position: "absolute",
            left: -90,
            top: dotSpacing * 1,
            width: 44,
            height: 44,
            borderRadius: 13,
            ...glassCard(`${C.green}20`),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.green}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        {/* Connecting lines from vault → rows */}
        {frame >= BATCH_START &&
          Array.from({ length: 3 }, (_, li) => {
            const lineFrame = BATCH_START + li * BATCH_STAGGER;
            const lineProgress = interpolate(frame, [lineFrame, lineFrame + 10], [0, 1], clamp);
            if (lineProgress <= 0) return null;

            return (
              <div
                key={li}
                style={{
                  position: "absolute",
                  left: -44,
                  top: dotSpacing * li + dotSpacing / 2,
                  width: 44 * lineProgress,
                  height: 2,
                  background: `linear-gradient(90deg, ${C.green}50, ${C.green}15)`,
                  boxShadow: `0 0 6px ${C.green}20`,
                }}
              />
            );
          })}

        {/* Wallet dots */}
        {WALLET_GRID.map((w) => {
          const batchIndex = Math.floor(w.id / BATCH_SIZE);
          const batchFrame = BATCH_START + batchIndex * BATCH_STAGGER;
          const dotDelay = batchFrame + (w.id % BATCH_SIZE) * 2;

          // Dot entrance
          const dotRel = frame - 32;
          const dotT = Math.min(Math.max(dotRel / 12, 0), 1);
          const dotOpacity = easeOut(dotT);

          // Activation
          const activateRel = frame - dotDelay;
          const isActive = activateRel >= 0;
          const glowT = Math.min(Math.max(activateRel / 10, 0), 1);
          const glowEased = easeOut(glowT);

          // Ripple
          const rippleSize = isActive ? interpolate(activateRel, [0, 14], [0, 28], clamp) : 0;
          const rippleOpacity = isActive ? interpolate(activateRel, [0, 14], [0.5, 0], clamp) : 0;

          return (
            <div
              key={w.id}
              style={{
                position: "absolute",
                left: w.col * dotSpacing,
                top: w.row * dotSpacing,
              }}
            >
              {/* Ripple */}
              {isActive && rippleOpacity > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 15 - rippleSize / 2,
                    top: 15 - rippleSize / 2,
                    width: rippleSize,
                    height: rippleSize,
                    borderRadius: "50%",
                    border: `1.5px solid ${C.green}`,
                    opacity: rippleOpacity,
                  }}
                />
              )}
              {/* Dot */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: isActive ? `${C.green}18` : C.card,
                  border: `1.5px solid ${isActive ? `${C.green}50` : C.border}`,
                  opacity: dotOpacity,
                  boxShadow: isActive ? `0 0 ${10 * glowEased}px ${C.green}25` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isActive && glowEased > 0.5 && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={C.green}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: glowEased }}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
