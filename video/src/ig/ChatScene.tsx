import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { C } from "../colors";
import { AnimGrid, FloatingOrbs, glassCard } from "./shared";

const messages = [
  {
    text: "bro im looking for a platform that gives rewards to holders",
    isMe: false,
    showAt: 30,
  },
  {
    text: "like actual fee sharing not just empty promises",
    isMe: false,
    showAt: 75,
  },
  { text: "you tried anvil?", isMe: true, showAt: 120 },
  { text: "what's that", isMe: false, showAt: 160 },
  { text: "hold on let me show you", isMe: true, showAt: 200 },
];

const typingPeriods = [
  { isMe: false, start: 10, end: 30 },
  { isMe: false, start: 55, end: 75 },
  { isMe: true, start: 100, end: 120 },
  { isMe: false, start: 140, end: 160 },
  { isMe: true, start: 180, end: 200 },
];

const TypingDots: React.FC<{ frame: number }> = ({ frame }) => (
  <div
    style={{
      display: "flex",
      gap: 5,
      padding: "14px 18px",
      borderRadius: 20,
      ...glassCard(),
      width: "fit-content",
    }}
  >
    {[0, 1, 2].map((i) => {
      const bounce = Math.sin(frame * 0.25 + i * 1.2) * 4;
      const dotOpacity = 0.3 + Math.sin(frame * 0.25 + i * 1.2) * 0.4;
      return (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: C.green,
            transform: `translateY(${bounce}px)`,
            opacity: dotOpacity,
            boxShadow: `0 0 6px ${C.green}40`,
          }}
        />
      );
    })}
  </div>
);

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeTyping = typingPeriods.find(
    (t) => frame >= t.start && frame < t.end
  );

  // Pulsing status dot
  const dotPulse = 0.5 + Math.sin(frame * 0.15) * 0.5;

  /* ── TRANSITION: Logo slam → green burst → dark fill ── */
  const transStart = 212;

  // Chat content fades out when logo appears
  const chatFade = interpolate(frame, [transStart, transStart + 12], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Logo pops out from center
  const logoSpring = spring({
    frame: frame - transStart,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoOp = interpolate(frame, [transStart, transStart + 4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Brand text appears after logo
  const brandOp = interpolate(frame, [transStart + 8, transStart + 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const brandSpring = spring({
    frame: frame - (transStart + 8),
    fps,
    config: { damping: 10, stiffness: 140 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [1.8, 1]);

  // Green radial burst expands from center
  const burstStart = transStart + 10;
  const burstProg = interpolate(frame, [burstStart, burstStart + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Scale from tiny to cover full diagonal (1080*sqrt2 ≈ 1527)
  const burstScale = interpolate(burstProg, [0, 1], [0, 18]);
  const burstOp = interpolate(
    frame,
    [burstStart, burstStart + 6, burstStart + 15, burstStart + 25],
    [0, 0.7, 0.4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dark fill grows behind the burst
  const darkFillOp = interpolate(frame, [burstStart + 5, burstStart + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Logo + brand fade out at very end
  const endFade = interpolate(frame, [248, 259], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.dark,
        opacity: fadeIn,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 100, y: 200, size: 350, color: C.green, speed: 0.01, phase: 0 },
          { x: 750, y: 600, size: 300, color: C.accent, speed: 0.013, phase: 3 },
        ]}
      />

      {/* ── Chat content (fades when transition starts) ── */}
      <div style={{ opacity: chatFade }}>
        {/* Header — glassmorphism */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderBottom: `1px solid rgba(255,255,255,0.04)`,
            ...glassCard(),
            borderRadius: 0,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {/* Live dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: C.green,
              boxShadow: `0 0 ${8 + dotPulse * 8}px ${C.green}${Math.round(dotPulse * 80).toString(16).padStart(2, "0")}`,
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: C.muted,
              fontFamily: C.font,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Messages
          </span>
        </div>

        {/* Messages */}
        <div
          style={{
            position: "absolute",
            top: 130,
            left: 40,
            right: 40,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {messages.map((msg, i) => {
            if (frame < msg.showAt) return null;
            const age = frame - msg.showAt;

            const enterSpring = spring({
              frame: age,
              fps,
              config: { damping: 12, stiffness: 160, mass: 0.8 },
            });
            const msgOpacity = interpolate(age, [0, 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const msgBlur = interpolate(age, [0, 8], [8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const msgScale = interpolate(enterSpring, [0, 1], [0.88, 1]);
            const msgY = interpolate(enterSpring, [0, 1], [18, 0]);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.isMe ? "flex-end" : "flex-start",
                  opacity: msgOpacity,
                  transform: `translateY(${msgY}px) scale(${msgScale})`,
                  transformOrigin: msg.isMe ? "right bottom" : "left bottom",
                  filter: `blur(${msgBlur}px)`,
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "20px 28px",
                    borderRadius: 26,
                    borderBottomRightRadius: msg.isMe ? 8 : 26,
                    borderBottomLeftRadius: msg.isMe ? 26 : 8,
                    ...(msg.isMe
                      ? {
                          ...glassCard(`${C.green}30`),
                          backgroundColor: `${C.green}12`,
                        }
                      : glassCard()),
                    fontSize: 26,
                    lineHeight: 1.5,
                    color: msg.isMe ? C.green : C.text,
                    fontFamily: C.font,
                    fontWeight: 400,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {activeTyping && (
            <div
              style={{
                display: "flex",
                justifyContent: activeTyping.isMe ? "flex-end" : "flex-start",
                opacity: interpolate(
                  frame - activeTyping.start,
                  [0, 5],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              <TypingDots frame={frame} />
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSITION OVERLAY ── */}
      {frame >= transStart && (
        <>
          {/* Dark fill — grows behind the burst */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: C.dark,
              opacity: darkFillOp,
              zIndex: 20,
            }}
          />

          {/* Green radial burst — energy expansion from center */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 100,
              height: 100,
              borderRadius: "50%",
              transform: `translate(-50%, -50%) scale(${burstScale})`,
              background: `radial-gradient(circle, ${C.green}60, ${C.green}30 30%, ${C.green}10 60%, transparent 80%)`,
              opacity: burstOp,
              zIndex: 25,
            }}
          />

          {/* Secondary burst ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 120,
              height: 120,
              borderRadius: "50%",
              transform: `translate(-50%, -50%) scale(${burstScale * 0.8})`,
              border: `2px solid ${C.green}`,
              opacity: burstOp * 0.5,
              zIndex: 25,
            }}
          />

          {/* Logo — slams into center */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -55%) scale(${logoScale})`,
              opacity: logoOp * endFade,
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Img
              src={staticFile("logo.svg")}
              style={{
                width: 80,
                height: 80,
                filter: `drop-shadow(0 0 30px ${C.green}40)`,
              }}
            />
            <div
              style={{
                opacity: brandOp,
                transform: `scale(${brandScale})`,
                fontSize: 28,
                fontWeight: 800,
                color: C.white,
                fontFamily: C.font,
                letterSpacing: -1,
                textShadow: `0 0 30px ${C.green}20`,
              }}
            >
              Anvil<span style={{ color: C.green }}> Protocol</span>
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
