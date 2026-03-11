import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { CounterType, MomentumSlide, Typewriter } from "../kinetic";
import { Background } from "../effects";
import { Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

export const DistDripScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [120, 140], [1, 0], clamp);

  // Tank fill
  const tankFill = interpolate(frame, [12, 50], [0, 100], clamp);

  // Slice separates
  const sliceT = interpolate(frame, [58, 78], [0, 1], clamp);
  const sliceEased = easeOut(sliceT);
  const sliceGap = sliceEased * 24;

  // Tank layout — centered in right third
  const tankX = 1200;
  const tankY = 200;
  const tankW = 220;
  const tankH = 520;

  // Ambient tank glow
  const tankGlow = 0.3 + Math.sin(frame * 0.05) * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />

      {/* Left side: typography */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 160,
          width: 900,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* "10%" — big counter + % */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            marginBottom: 12,
          }}
        >
          <CounterType
            target={10}
            startFrame={8}
            duration={22}
            fontSize={180}
            color={C.green}
            fontWeight={900}
            style={{ lineHeight: 0.9 }}
          />
          <MomentumSlide
            text="%"
            startFrame={16}
            from="right"
            distance={80}
            duration={14}
            fontSize={120}
            color={C.green}
            fontWeight={900}
            style={{ lineHeight: 0.9 }}
          />
        </div>

        {/* "per interval" */}
        <div style={{ marginBottom: 48, minHeight: 36 }}>
          <Typewriter
            text="per interval"
            startFrame={28}
            speed={2}
            fontSize={28}
            color={C.muted}
            fontFamily={C.mono}
            fontWeight={500}
          />
        </div>

        {/* "drip rate" / "smooth decay" stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          <MomentumSlide
            text="drip rate"
            startFrame={48}
            from="left"
            distance={350}
            duration={20}
            fontSize={52}
            color={C.white}
            fontWeight={700}
          />
          <MomentumSlide
            text="smooth decay"
            startFrame={56}
            from="left"
            distance={350}
            duration={20}
            fontSize={52}
            color={C.cyan}
            fontWeight={700}
          />
        </div>

        {/* "never all at once" */}
        <div
          style={{
            opacity: interpolate(frame, [78, 92], [0, 1], clamp),
            fontSize: 20,
            color: `${C.muted}90`,
            fontFamily: C.font,
            fontWeight: 400,
            letterSpacing: 0.5,
          }}
        >
          never all at once
        </div>
      </div>

      {/* Glass tank */}
      <div
        style={{
          position: "absolute",
          left: tankX,
          top: tankY,
          width: tankW,
          height: tankH,
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          backgroundColor: `${C.card}90`,
          backdropFilter: "blur(16px)",
          overflow: "visible",
          boxShadow: `0 0 40px ${C.green}${Math.round(tankGlow * 15).toString(16).padStart(2, "0")}, inset 0 1px 0 rgba(255,255,255,0.04)`,
          opacity: interpolate(frame, [8, 20], [0, 1], clamp),
        }}
      >
        {/* Inner container clips fill */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 24, overflow: "hidden" }}>
          {/* Fill level */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${tankFill}%`,
              background: `linear-gradient(180deg, ${C.green}20, ${C.green}08)`,
              borderTop: tankFill > 2 ? `1px solid ${C.green}25` : "none",
            }}
          />

          {/* Surface shimmer on fill top */}
          {tankFill > 5 && (
            <div
              style={{
                position: "absolute",
                bottom: `${tankFill}%`,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${C.green}30, transparent)`,
                transform: "translateY(50%)",
              }}
            />
          )}

          {/* 10% slice — bottom portion slides out */}
          {frame >= 56 && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `10%`,
                background: `linear-gradient(180deg, ${C.green}40, ${C.green}15)`,
                borderTop: `2px solid ${C.green}60`,
                transform: `translateX(${sliceGap}px)`,
                borderRadius: sliceGap > 5 ? "0 12px 12px 0" : 0,
                boxShadow: sliceGap > 5 ? `0 0 16px ${C.green}20` : "none",
              }}
            />
          )}

          {/* Tick marks */}
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              style={{
                position: "absolute",
                bottom: `${pct}%`,
                left: 8,
                width: 16,
                height: 1,
                backgroundColor: `${C.border}50`,
              }}
            />
          ))}
        </div>

        {/* 10% label */}
        {sliceGap > 8 && (
          <div
            style={{
              position: "absolute",
              bottom: `5%`,
              right: -60,
              fontSize: 15,
              fontWeight: 700,
              color: C.green,
              fontFamily: C.mono,
              opacity: sliceEased,
              transform: "translateY(50%)",
            }}
          >
            10%
          </div>
        )}
      </div>

      {/* Tank label */}
      <div
        style={{
          position: "absolute",
          left: tankX,
          top: tankY + tankH + 20,
          width: tankW,
          textAlign: "center",
          fontSize: 12,
          color: C.muted,
          fontFamily: C.font,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: interpolate(frame, [18, 30], [0, 1], clamp),
        }}
      >
        Vault Pool
      </div>

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
