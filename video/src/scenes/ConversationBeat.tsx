import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";

/* ─── Message data ─── */

interface Msg {
  side: "left" | "right";
  text: string;
  typingAt: number;
  showAt: number;
}

const messages: Msg[] = [
  {
    side: "right",
    text: "yo is there any protocol that shares trading fees with holders?",
    typingAt: 8,
    showAt: 35,
  },
  {
    side: "left",
    text: "nah every launchpad just takes the fees and dips lmao",
    typingAt: 65,
    showAt: 95,
  },
  {
    side: "right",
    text: "fr... holders create all the volume but get $0",
    typingAt: 130,
    showAt: 160,
  },
  {
    side: "left",
    text: "someone needs to build this fr",
    typingAt: 200,
    showAt: 225,
  },
];

/* ─── Typing Indicator ─── */

const TypingDots: React.FC<{
  side: "left" | "right";
  startFrame: number;
  endFrame: number;
}> = ({ side, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  if (frame < startFrame || frame >= endFrame) return null;

  const fadeIn = interpolate(rel, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [endFrame - 4, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isLeft = side === "left";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isLeft ? "flex-start" : "flex-end",
        padding: "0 18px",
        paddingLeft: isLeft ? 58 : 18, // offset for avatar
        paddingRight: isLeft ? 18 : 58,
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "10px 16px",
          borderRadius: 18,
          backgroundColor: isLeft ? "#14142a" : `${C.green}0c`,
          border: `1px solid ${isLeft ? "#1e1e38" : C.green + "18"}`,
        }}
      >
        {[0, 1, 2].map((i) => {
          const phase = (rel * 0.2 + i * 1.8) % (Math.PI * 2);
          const y = Math.sin(phase) * 3.5;
          return (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: isLeft ? "#555568" : C.green + "70",
                transform: `translateY(${y}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ─── Chat Bubble ─── */

const ChatBubble: React.FC<{ msg: Msg; isLast: boolean }> = ({
  msg,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < msg.showAt) return null;

  const rel = frame - msg.showAt;
  const scaleSpring = spring({
    frame: rel,
    fps,
    config: { damping: 14, stiffness: 140 },
  });
  const scale = interpolate(scaleSpring, [0, 1], [0.6, 1]);
  const opacity = interpolate(rel, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isLeft = msg.side === "left";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isLeft ? "flex-start" : "flex-end",
        padding: "0 18px",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: isLeft ? "left center" : "right center",
      }}
    >
      {/* Avatar left */}
      {isLeft && (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
            marginRight: 8,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 12px ${C.accent}30`,
          }}
        />
      )}

      <div
        style={{
          maxWidth: 360,
          padding: "12px 18px",
          borderRadius: isLeft ? "4px 20px 20px 20px" : "20px 4px 20px 20px",
          backgroundColor: isLeft ? "#14142a" : `${C.green}0c`,
          border: `1px solid ${isLeft ? "#1e1e38" : C.green + "18"}`,
          fontSize: 15,
          lineHeight: 1.55,
          color: isLast ? C.white : "#c8c8d8",
          fontFamily: C.font,
          fontWeight: isLast ? 500 : 400,
        }}
      >
        {msg.text}
      </div>

      {/* Avatar right */}
      {!isLeft && (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
            marginLeft: 8,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 12px ${C.green}30`,
          }}
        />
      )}
    </div>
  );
};

/* ─── Main Conversation Beat ─── */
// Duration: 335 frames (conversation 0-275, zoom 275-335)

export const ConversationBeat: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow ambient zoom building tension (1 → 1.04 over 275 frames)
  const ambientZoom = interpolate(frame, [0, 275], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Zoom punch-through (starts at frame 275) ──
  const zoomStart = 275;
  const zoomDuration = 45;
  const zoomProgress = interpolate(
    frame,
    [zoomStart, zoomStart + zoomDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Exponential zoom for dramatic acceleration
  const punchZoom = frame < zoomStart ? 1 : 1 + Math.pow(zoomProgress, 2.5) * 25;
  const totalZoom = ambientZoom * punchZoom;

  const zoomBlur = Math.pow(zoomProgress, 1.5) * 40;
  const zoomBrightness = 1 + Math.pow(zoomProgress, 2) * 10;

  // Final flash (last ~12 frames)
  const flashOp = interpolate(
    frame,
    [zoomStart + zoomDuration - 15, zoomStart + zoomDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Chat UI fade in
  const containerOp = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const containerScale = interpolate(frame, [0, 15], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#07070d" }}>
      {/* Subtle ambient glows */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.accent}08, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "25%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}06, transparent)`,
        }}
      />

      {/* Zoomable container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${totalZoom})`,
          filter:
            zoomProgress > 0
              ? `blur(${zoomBlur}px) brightness(${zoomBrightness})`
              : "none",
          transformOrigin: "50% 75%",
          opacity: containerOp,
        }}
      >
        {/* Chat container */}
        <div
          style={{
            width: 530,
            borderRadius: 28,
            backgroundColor: "#0b0b15",
            border: `1px solid #1a1a30`,
            overflow: "hidden",
            boxShadow:
              "0 12px 60px rgba(0,0,0,0.6), 0 0 80px rgba(124,58,237,0.04)",
            transform: `scale(${containerScale})`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 22px",
              borderBottom: `1px solid #1a1a30`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
                  boxShadow: `0 0 10px ${C.green}25`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.white,
                    fontFamily: C.font,
                    lineHeight: 1.2,
                  }}
                >
                  anon_dev
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#555568",
                    fontFamily: C.font,
                  }}
                >
                  online
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#444458",
                fontFamily: C.font,
              }}
            >
              now
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "18px 0",
              minHeight: 350,
            }}
          >
            {messages.map((msg, i) => (
              <React.Fragment key={i}>
                <TypingDots
                  side={msg.side}
                  startFrame={msg.typingAt}
                  endFrame={msg.showAt + 3}
                />
                <ChatBubble msg={msg} isLast={i === messages.length - 1} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom flash overlay */}
      {flashOp > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: C.white,
            opacity: flashOp,
            zIndex: 10,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
