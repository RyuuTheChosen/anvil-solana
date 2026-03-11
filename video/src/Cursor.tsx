import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface CursorWaypoint {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

/** Per-segment ease-in-out interpolation for smooth cursor movement */
function smoothInterpolate(
  frame: number,
  keyframes: number[],
  values: number[]
): number {
  if (keyframes.length === 0) return 0;
  if (frame <= keyframes[0]) return values[0];
  if (frame >= keyframes[keyframes.length - 1])
    return values[values.length - 1];

  let i = 0;
  while (i < keyframes.length - 1 && keyframes[i + 1] < frame) i++;

  const segStart = keyframes[i];
  const segEnd = keyframes[i + 1];
  const t = (frame - segStart) / (segEnd - segStart);
  // Ease in-out cubic
  const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return values[i] + (values[i + 1] - values[i]) * eased;
}

export const Cursor: React.FC<{ waypoints: CursorWaypoint[] }> = ({
  waypoints,
}) => {
  const frame = useCurrentFrame();

  if (waypoints.length === 0 || frame < waypoints[0].frame) return null;

  const frames = waypoints.map((w) => w.frame);
  const xs = waypoints.map((w) => w.x);
  const ys = waypoints.map((w) => w.y);

  const x = smoothInterpolate(frame, frames, xs);
  const y = smoothInterpolate(frame, frames, ys);

  // Fade in
  const opacity = interpolate(
    frame,
    [waypoints[0].frame, waypoints[0].frame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Click ripple
  const activeClick = waypoints.find(
    (w) => w.click && frame >= w.frame && frame < w.frame + 18
  );
  const clickProgress = activeClick
    ? interpolate(
        frame,
        [activeClick.frame, activeClick.frame + 18],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        zIndex: 100,
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
      }}
    >
      {/* Click ripple */}
      {activeClick && (
        <div
          style={{
            position: "absolute",
            left: 2,
            top: 2,
            width: 30 + clickProgress * 40,
            height: 30 + clickProgress * 40,
            borderRadius: "50%",
            border: `2px solid rgba(0, 255, 136, ${0.8 * (1 - clickProgress)})`,
            transform: "translate(-50%, -50%)",
            backgroundColor: `rgba(0, 255, 136, ${0.12 * (1 - clickProgress)})`,
          }}
        />
      )}
      {/* Cursor pointer */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M6 3L22 14L14 16L10 24L6 3Z"
          fill="white"
          stroke="#06060b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
