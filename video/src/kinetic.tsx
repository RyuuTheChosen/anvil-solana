import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { C } from "./colors";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);
const easeOutExpo = Easing.out(Easing.exp);

/* ── GravityDrop ──────────────────────────────────────
   Text falls from above with acceleration, soft settle. */

export const GravityDrop: React.FC<{
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  dropDistance?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  fontSize = 72,
  color = C.white,
  fontFamily = C.font,
  fontWeight = 800,
  dropDistance = 80,
  duration = 18,
  style,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  if (rel < -2) return null;

  const t = Math.min(Math.max(rel / duration, 0), 1);
  const eased = easeOut(t);
  const y = (1 - eased) * -dropDistance;
  const opacity = interpolate(rel, [0, 6], [0, 1], clamp);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1.05,
        letterSpacing: fontSize >= 100 ? -5 : fontSize >= 60 ? -3 : -1,
        transform: `translateY(${y}px)`,
        opacity,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* ── MomentumSlide ────────────────────────────────────
   Enters from offscreen fast, decelerates to stop. */

export const MomentumSlide: React.FC<{
  text: string;
  startFrame: number;
  from?: "left" | "right" | "top" | "bottom";
  distance?: number;
  duration?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  from = "left",
  distance = 400,
  duration = 20,
  fontSize = 72,
  color = C.white,
  fontFamily = C.font,
  fontWeight = 800,
  style,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  if (rel < -2) return null;

  const t = Math.min(Math.max(rel / duration, 0), 1);
  const eased = easeOut(t);
  const remaining = (1 - eased) * distance;

  const dx =
    from === "left" ? -remaining : from === "right" ? remaining : 0;
  const dy =
    from === "top" ? -remaining : from === "bottom" ? remaining : 0;
  const opacity = interpolate(rel, [0, 5], [0, 1], clamp);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1.05,
        letterSpacing: fontSize >= 100 ? -5 : fontSize >= 60 ? -3 : -1,
        transform: `translate(${dx}px, ${dy}px)`,
        opacity,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* ── WordCascade ──────────────────────────────────────
   Words appear sequentially, each gravity-dropping in. */

export const WordCascade: React.FC<{
  words: string[];
  startFrame: number;
  stagger?: number;
  direction?: "down" | "up";
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  gap?: number;
  colors?: (string | undefined)[];
  inline?: boolean;
  style?: React.CSSProperties;
}> = ({
  words,
  startFrame,
  stagger = 4,
  direction = "down",
  fontSize = 48,
  color = C.text,
  fontFamily = C.font,
  fontWeight = 600,
  gap = 12,
  colors,
  inline = false,
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        gap,
        alignItems: inline ? "baseline" : "flex-start",
        flexWrap: inline ? "wrap" : "nowrap",
        ...style,
      }}
    >
      {words.map((word, i) => {
        const wordStart = startFrame + i * stagger;
        const rel = frame - wordStart;
        const t = Math.min(Math.max(rel / 14, 0), 1);
        const eased = easeOut(t);
        const dist = direction === "down" ? -40 : 40;
        const y = (1 - eased) * dist;
        const opacity = interpolate(rel, [0, 5], [0, 1], clamp);
        const wordColor = colors?.[i] ?? color;

        return (
          <div
            key={i}
            style={{
              fontSize,
              fontWeight,
              fontFamily,
              color: wordColor,
              lineHeight: 1.1,
              letterSpacing: fontSize >= 60 ? -2 : -0.5,
              transform: `translateY(${y}px)`,
              opacity,
              whiteSpace: "nowrap",
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
};

/* ── LetterReveal ─────────────────────────────────────
   Letters appear one-by-one, scale 0.5→1 with gentle ease. */

export const LetterReveal: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  speed = 2,
  fontSize = 42,
  color = C.white,
  fontFamily = C.font,
  fontWeight = 800,
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        lineHeight: 1.1,
        ...style,
      }}
    >
      {text.split("").map((char, i) => {
        const charStart = startFrame + i * speed;
        const rel = frame - charStart;
        const t = Math.min(Math.max(rel / 10, 0), 1);
        const eased = easeOut(t);
        const scale = 0.5 + eased * 0.5;
        const opacity = interpolate(rel, [0, 6], [0, 1], clamp);
        const yOff = (1 - eased) * -6;

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight,
              fontFamily,
              color,
              letterSpacing: fontSize >= 40 ? -1.5 : -0.5,
              display: "inline-block",
              transform: `scale(${scale}) translateY(${yOff}px)`,
              opacity,
              minWidth: char === " " ? fontSize * 0.3 : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

/* ── CounterType ──────────────────────────────────────
   Number counts from 0→target with easeOutExpo. */

export const CounterType: React.FC<{
  target: number;
  startFrame: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  target,
  startFrame,
  duration = 30,
  suffix = "",
  prefix = "",
  decimals = 0,
  fontSize = 72,
  color = C.green,
  fontFamily = C.mono,
  fontWeight = 900,
  style,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const t = Math.min(Math.max(rel / duration, 0), 1);
  const eased = easeOutExpo(t);
  const value = eased * target;
  const opacity = interpolate(rel, [0, 5], [0, 1], clamp);

  return (
    <span
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1,
        letterSpacing: -2,
        opacity,
        display: "inline-block",
        ...style,
      }}
    >
      {prefix}
      {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
      {suffix}
    </span>
  );
};

/* ── TextDrift ────────────────────────────────────────
   Smoothly interpolates position over duration. */

export const TextDrift: React.FC<{
  children: React.ReactNode;
  startFrame: number;
  duration?: number;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  startFrame,
  duration = 20,
  fromX = 0,
  fromY = 0,
  toX = 0,
  toY = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const t = Math.min(Math.max(rel / duration, 0), 1);
  const eased = easeOut(t);
  const x = fromX + (toX - fromX) * eased;
  const y = fromY + (toY - fromY) * eased;

  return (
    <div style={{ transform: `translate(${x}px, ${y}px)`, ...style }}>
      {children}
    </div>
  );
};

/* ── Typewriter ───────────────────────────────────────
   Characters reveal left-to-right at fixed speed. */

export const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  cursor?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  speed = 2,
  cursor = true,
  fontSize = 36,
  color = C.text,
  fontFamily = C.mono,
  fontWeight = 600,
  style,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  if (rel < 0) return null;

  const chars = Math.min(Math.floor(rel / speed), text.length);
  const displayed = text.slice(0, chars);
  const done = chars >= text.length;
  const cursorVisible = cursor && !done && Math.floor(frame / 4) % 2 === 0;

  return (
    <span
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1.3,
        letterSpacing: -0.5,
        ...style,
      }}
    >
      {displayed}
      {cursorVisible && (
        <span style={{ color: C.green, opacity: 0.8 }}>|</span>
      )}
    </span>
  );
};

/* ── FadeOut wrapper ──────────────────────────────────
   Fades children out over a frame range. */

export const FadeOut: React.FC<{
  startFrame: number;
  duration?: number;
  children: React.ReactNode;
}> = ({ startFrame, duration = 15, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [1, 0],
    clamp
  );
  return <div style={{ opacity }}>{children}</div>;
};
