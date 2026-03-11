import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { Cursor } from "../Cursor";

const FlowNode: React.FC<{
  label: string;
  sub: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  opacity: number;
  scale: number;
  icon: React.ReactNode;
}> = ({ label, sub, borderColor, bgColor, textColor, opacity, scale, icon }) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
      padding: "14px 24px",
      borderRadius: 18,
      border: `1px solid ${borderColor}`,
      backgroundColor: bgColor,
      textAlign: "center",
      boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 4,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: textColor,
          fontFamily: C.font,
        }}
      >
        {label}
      </span>
    </div>
    <div style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>{sub}</div>
  </div>
);

const DestCard: React.FC<{
  title: string;
  pct: string;
  desc: string;
  color: string;
  opacity: number;
  scale: number;
  icon: React.ReactNode;
}> = ({ title, pct, desc, color, opacity, scale, icon }) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
      width: 230,
      padding: "20px 18px",
      borderRadius: 18,
      border: `1px solid ${color}25`,
      backgroundColor: C.card,
      textAlign: "center",
      boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginBottom: 8,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.white,
          fontFamily: C.font,
        }}
      >
        {title}
      </span>
    </div>
    <div
      style={{
        fontSize: 36,
        fontWeight: 700,
        color,
        fontFamily: C.mono,
        marginBottom: 6,
        lineHeight: 1,
      }}
    >
      {pct}
    </div>
    <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, lineHeight: 1.5 }}>
      {desc}
    </div>
  </div>
);

export const FeeFlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Every Trade node (frame 15)
  const tradeOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tradeScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  // Arrow down (frame 30-60)
  const arrow1Height = interpolate(frame, [30, 55], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Vault node (frame 50)
  const vaultOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vaultScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  // Split arrows (frame 75-110)
  const splitProgress = interpolate(frame, [75, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Destination cards
  const destDelays = [100, 110, 120];
  const destScales = destDelays.map((d) =>
    spring({ frame: frame - d, fps, config: { damping: 14, stiffness: 80 } })
  );
  const destOpacities = destDelays.map((d) =>
    interpolate(frame, [d, d + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Animated percentages
  const holderPct = interpolate(frame, [110, 160], [0, 47.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lpPct = interpolate(frame, [120, 170], [0, 47.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const treasuryPct = interpolate(frame, [130, 170], [0, 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.035,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}08, transparent)`,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 35,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 3,
            color: C.green,
            fontFamily: C.font,
            marginBottom: 8,
          }}
        >
          Economics
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1,
          }}
        >
          Where the fees go
        </div>
      </div>

      {/* Flow diagram */}
      <div
        style={{
          position: "absolute",
          top: 155,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Every Trade node */}
        <FlowNode
          label="Every Trade"
          sub="Generates creator trading fees"
          borderColor={C.border}
          bgColor={C.card}
          textColor={C.white}
          opacity={tradeOpacity}
          scale={tradeScale}
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.green}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />

        {/* Arrow down */}
        <div
          style={{
            width: 2,
            height: arrow1Height,
            background: `linear-gradient(${C.green}60, ${C.accent}60)`,
            margin: "2px 0",
          }}
        />

        {/* Anvil Vault node */}
        <FlowNode
          label="Anvil Vault"
          sub="100% of creator fees deposited on-chain"
          borderColor={`${C.green}30`}
          bgColor={`${C.green}08`}
          textColor={C.green}
          opacity={vaultOpacity}
          scale={vaultScale}
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.green}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          }
        />

        {/* Split arrows */}
        <div
          style={{
            position: "relative",
            width: 700,
            height: 60,
            marginTop: 2,
          }}
        >
          {/* Center line down */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 2,
              height: 20 * splitProgress,
              background: `${C.green}40`,
              transform: "translateX(-50%)",
            }}
          />
          {/* Horizontal bar */}
          <div
            style={{
              position: "absolute",
              left: `${50 - 40 * splitProgress}%`,
              right: `${50 - 40 * splitProgress}%`,
              top: 20,
              height: 2,
              background: `linear-gradient(90deg, ${C.cyan}40, ${C.accent}40, ${C.pink}40)`,
            }}
          />
          {/* Three vertical drops */}
          {[10, 50, 90].map((pct, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: 20,
                width: 2,
                height: 30 * Math.max(0, splitProgress - 0.3) / 0.7,
                background: [C.cyan, C.accent, C.pink][i] + "40",
                transform: "translateX(-50%)",
              }}
            />
          ))}
          {/* Arrow tips */}
          {[10, 50, 90].map((pct, i) => {
            const tipOpacity = Math.max(0, (splitProgress - 0.6) / 0.4);
            return (
              <svg
                key={i}
                width="12"
                height="8"
                viewBox="0 0 12 8"
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  top: 48,
                  transform: "translateX(-50%)",
                  opacity: tipOpacity,
                  color: [C.cyan, C.accent, C.pink][i] + "90",
                }}
              >
                <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
              </svg>
            );
          })}
        </div>

        {/* Destination cards */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 8,
          }}
        >
          <DestCard
            title="Holders"
            pct={`${holderPct.toFixed(1)}%`}
            desc="Top 100 by score. Merkle-verified claims."
            color={C.cyan}
            opacity={destOpacities[0]}
            scale={destScales[0]}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.cyan}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <DestCard
            title="LP Pool"
            pct={`${lpPct.toFixed(1)}%`}
            desc="DEX liquidity, deployed post-graduation."
            color={C.accent}
            opacity={destOpacities[1]}
            scale={destScales[1]}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.accent}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
          <DestCard
            title="Treasury"
            pct={`${treasuryPct.toFixed(1)}%`}
            desc="Platform fee. Funds development."
            color={C.pink}
            opacity={destOpacities[2]}
            scale={destScales[2]}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.pink}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Cursor */}
      <Cursor
        waypoints={[
          { frame: 30, x: 640, y: 200 },
          { frame: 65, x: 640, y: 330 },
          { frame: 120, x: 330, y: 520 },
          { frame: 150, x: 640, y: 520 },
          { frame: 180, x: 950, y: 520 },
          { frame: 210, x: 950, y: 600 },
        ]}
      />
    </AbsoluteFill>
  );
};
