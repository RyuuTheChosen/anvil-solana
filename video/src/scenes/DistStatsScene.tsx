import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { CounterType, MomentumSlide } from "../kinetic";
import { Background } from "../effects";
import { Vignette } from "../ig/shared";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const DistStatsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);
  const fadeOut = interpolate(frame, [48, 60], [1, 0], clamp);

  // Accent line between stats
  const lineOpacity = interpolate(frame, [18, 28], [0, 1], clamp);
  const lineWidth = interpolate(frame, [18, 32], [0, 120], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, opacity: fadeIn * fadeOut }}>
      <Background />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Stat 1 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <CounterType
            target={512}
            startFrame={5}
            duration={24}
            fontSize={130}
            color={C.green}
            fontWeight={900}
          />
          <MomentumSlide
            text="holders per vault"
            startFrame={10}
            from="right"
            distance={180}
            duration={18}
            fontSize={40}
            color={C.text}
            fontWeight={600}
          />
        </div>

        {/* Divider line */}
        <div
          style={{
            width: lineWidth,
            height: 1,
            backgroundColor: `${C.border}`,
            opacity: lineOpacity,
            marginBottom: 32,
          }}
        />

        {/* Stat 2 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <MomentumSlide
            text="every hour"
            startFrame={20}
            from="left"
            distance={180}
            duration={18}
            fontSize={76}
            color={C.cyan}
            fontWeight={800}
          />
          <MomentumSlide
            text="automatically"
            startFrame={26}
            from="right"
            distance={180}
            duration={18}
            fontSize={38}
            color={C.muted}
            fontWeight={500}
          />
        </div>
      </div>

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
