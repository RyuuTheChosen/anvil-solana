import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { C } from "./colors";
import {
  AnimGrid,
  FloatingOrbs,
  GrainOverlay,
  ScanLines,
  Vignette,
  AmbientParticles,
  shimmerStyle,
} from "./ig/shared";

/*
 * TAG TO LAUNCH — ~30s composition (900 frames @ 30fps)
 *
 * Scene 0: IntroScene      (0-160)     — Logo × X, "One Tweet. Fully Configured."
 * Scene 1: ComposeScene    (150-420)   — X compose UI, typewriter, image, Post
 * Scene 2: ReplyScene      (410-750)   — Tweet thread + bot reply
 * Scene 3: EndCard         (740-900)   — Logo + CTA
 */

/* ════════════════════════════════════════════════════════════
   X / TWITTER COLORS (dark mode)
   ════════════════════════════════════════════════════════════ */
const X = {
  bg: "#000000",
  panel: "#16181c",
  border: "#2f3336",
  text: "#e7e9ea",
  secondary: "#71767b",
  blue: "#1d9bf0",
  like: "#f91880",
  repost: "#00ba7c",
};

/* ════════════════════════════════════════════════════════════
   SCENE 0 — INTRO (80 frames)
   Logo × X icon, subtitle "Launch by Tagging"
   (AiIntroScene style — smooth spring entrances, no slam)
   ════════════════════════════════════════════════════════════ */
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [145, 160], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [148, 160], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo entrance (left)
  const logoSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [2.5, 1]);
  const logoOp = interpolate(frame, [5, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [5, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "×" connector
  const xOp = interpolate(frame, [14, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const xScale = spring({
    frame: frame - 14,
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  // X logo entrance (right)
  const xLogoSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 9, stiffness: 160, mass: 0.8 },
  });
  const xLogoScale = interpolate(xLogoSpring, [0, 1], [2.5, 1]);
  const xLogoOp = interpolate(frame, [5, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const xLogoBlur = interpolate(frame, [5, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Brand text
  const brandSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 10, stiffness: 140 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [1.6, 1]);
  const brandOp = interpolate(frame, [24, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandBlur = interpolate(frame, [24, 32], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle
  const subOp = interpolate(frame, [34, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [34, 46], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow
  const glow = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing rings
  const ring1Scale = 1 + Math.sin(frame * 0.1) * 0.06;
  const ring2Scale = 1 + Math.sin(frame * 0.1 + 1.5) * 0.08;
  const ring3Scale = 1 + Math.sin(frame * 0.1 + 3) * 0.05;
  const ringsOp = interpolate(frame, [8, 28], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, ${C.dark} 70%)`,
        opacity: fadeIn * fadeOut,
        filter: `blur(${exitBlur}px)`,
      }}
    >
      <AnimGrid speed={0.15} />
      <FloatingOrbs
        orbs={[
          { x: 500, y: 250, size: 550, color: C.green, speed: 0.01, phase: 0 },
          { x: 1300, y: 550, size: 480, color: C.accent, speed: 0.008, phase: 2.5 },
          { x: 250, y: 500, size: 400, color: C.cyan, speed: 0.012, phase: 4 },
          { x: 960, y: 200, size: 350, color: C.green, speed: 0.006, phase: 1.2 },
        ]}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1100,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}15, transparent 70%)`,
          opacity: glow,
        }}
      />

      {/* Pulsing rings */}
      {[ring1Scale, ring2Scale, ring3Scale].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -55%) scale(${s})`,
            width: 280 + i * 120,
            height: 280 + i * 120,
            borderRadius: "50%",
            border: `1px solid ${C.green}${["10", "08", "05"][i]}`,
            boxShadow:
              i === 0
                ? `0 0 40px ${C.green}06, inset 0 0 40px ${C.green}04`
                : "none",
            opacity: ringsOp,
          }}
        />
      ))}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          zIndex: 2,
          position: "relative",
        }}
      >
        {/* Logo × X icon row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 28,
          }}
        >
          {/* Anvil Logo */}
          <div
            style={{
              transform: `scale(${logoScale})`,
              opacity: logoOp,
              filter: `blur(${logoBlur}px)`,
            }}
          >
            <Img
              src={staticFile("logo.svg")}
              style={{
                width: 130,
                height: 130,
                filter: `drop-shadow(0 0 24px ${C.green}30)`,
              }}
            />
          </div>

          {/* × */}
          <div
            style={{
              opacity: xOp,
              transform: `scale(${interpolate(xScale, [0, 1], [1.8, 1])})`,
              fontSize: 36,
              fontWeight: 300,
              color: C.muted,
              fontFamily: C.font,
            }}
          >
            ×
          </div>

          {/* X / Twitter logo */}
          <div
            style={{
              transform: `scale(${xLogoScale})`,
              opacity: xLogoOp,
              filter: `blur(${xLogoBlur}px)`,
            }}
          >
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: 28,
                backgroundColor: X.panel,
                border: `1px solid ${X.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: `drop-shadow(0 0 24px ${X.blue}20)`,
              }}
            >
              {/* X logo SVG */}
              <svg width="70" height="70" viewBox="0 0 24 24" fill={X.text}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand */}
        <div
          style={{
            opacity: brandOp,
            transform: `scale(${brandScale})`,
            filter: `blur(${brandBlur}px)`,
            fontSize: 56,
            fontWeight: 800,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -2.5,
            marginBottom: 16,
            textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          }}
        >
          Anvil<span style={{ color: C.green }}> Protocol</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOp,
            transform: `translateY(${subY}px)`,
            fontSize: 24,
            fontFamily: C.font,
            letterSpacing: 0.5,
            background: `linear-gradient(135deg, ${C.text}, ${C.muted})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          One Tweet. Fully Configured.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 1 — COMPOSE (200 frames)
   X-style compose modal with typewriter + image attach + Post
   ════════════════════════════════════════════════════════════ */

const TWEET_TEXT =
  "@AnvilProtocol launch Wagmi $WAGMI for the community holders:200 split:75%";

// The key message: one tweet configures everything — launch + vault + fee sharing

const ComposeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transitions
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterScale = interpolate(frame, [0, 14], [0.93, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [255, 270], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [258, 270], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Panel entrance
  const panelProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const panelY = interpolate(panelProgress, [0, 1], [60, 0]);

  // Typewriter (starts frame 20, slower ~1.2 chars per frame)
  const typedChars = Math.floor(
    interpolate(frame, [20, 100], [0, TWEET_TEXT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const caretBlink = Math.sin(frame * 0.4) > 0;

  // Highlight @AnvilProtocol in blue
  const displayedText = TWEET_TEXT.slice(0, typedChars);

  // Image attachment slides in after typing
  const imgProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const imgScale = interpolate(imgProgress, [0, 1], [0.8, 1]);
  const imgOp = interpolate(frame, [118, 126], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Post button glow after everything is ready
  const postReady = frame >= 150;
  const postGlow = postReady
    ? 0.5 + Math.sin((frame - 150) * 0.15) * 0.5
    : 0;

  // Post click at frame 190
  const postClicked = frame >= 190;
  const clickScale = postClicked
    ? interpolate(frame, [190, 194, 198], [1, 0.92, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Shimmer on post button
  const shim = shimmerStyle(frame, 155, 25);

  // Sending state after click
  const sendingOp = interpolate(frame, [198, 206], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0a0e18 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 200, y: 150, size: 480, color: C.green, speed: 0.01, phase: 1 },
          { x: 1500, y: 500, size: 420, color: C.accent, speed: 0.013, phase: 3 },
          { x: 800, y: 800, size: 380, color: C.cyan, speed: 0.016, phase: 5 },
        ]}
      />

      {/* ═══ X COMPOSE PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 480,
          right: 480,
          borderRadius: 20,
          border: `1px solid ${X.border}`,
          backgroundColor: X.panel,
          boxShadow:
            "0 8px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          overflow: "hidden",
          transform: `translateY(${panelY}px)`,
          opacity: interpolate(frame, [5, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${X.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: X.secondary,
              fontFamily: C.font,
              cursor: "pointer",
            }}
          >
            Cancel
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Drafts */}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: X.blue,
                fontFamily: C.font,
              }}
            >
              Drafts
            </span>
            {/* Post button */}
            <div
              style={{
                position: "relative",
                padding: "8px 22px",
                borderRadius: 20,
                backgroundColor: postReady ? X.blue : `${X.blue}80`,
                transform: `scale(${clickScale})`,
                boxShadow: postReady
                  ? `0 0 ${16 * postGlow}px ${X.blue}40`
                  : "none",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: C.font,
                }}
              >
                Post
              </span>
              {shim && <div style={shim} />}
            </div>
          </div>
        </div>

        {/* Compose body */}
        <div style={{ padding: "20px 20px 16px", display: "flex", gap: 14 }}>
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.accent}40, ${C.green}30)`,
              border: `2px solid ${C.accent}30`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: C.white,
              fontFamily: C.font,
            }}
          >
            W
          </div>

          {/* Text area */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                minHeight: 80,
                fontSize: 20,
                lineHeight: 1.4,
                color: X.text,
                fontFamily: C.font,
                fontWeight: 400,
                wordBreak: "break-word",
              }}
            >
              {frame < 20 ? (
                <span style={{ color: X.secondary }}>What is happening?!</span>
              ) : (
                <TweetTextHighlighted text={displayedText} />
              )}
              {frame >= 20 && frame < 104 && caretBlink && (
                <span
                  style={{
                    color: X.blue,
                    fontWeight: 300,
                    marginLeft: 1,
                  }}
                >
                  |
                </span>
              )}
            </div>

            {/* Image attachment */}
            {frame >= 118 && (
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  border: `1px solid ${X.border}`,
                  overflow: "hidden",
                  opacity: imgOp,
                  transform: `scale(${imgScale})`,
                  height: 200,
                  background: `linear-gradient(135deg, ${C.green}15, ${C.accent}15, ${C.cyan}10)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Mock token image */}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 32px ${C.green}30`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: C.dark,
                      fontFamily: C.font,
                    }}
                  >
                    W
                  </span>
                </div>
                {/* Token name overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 14,
                    left: 16,
                    padding: "6px 14px",
                    borderRadius: 10,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.white,
                      fontFamily: C.font,
                    }}
                  >
                    WAGMI
                  </span>
                </div>
                {/* X remove button */}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: X.text,
                  }}
                >
                  ×
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${X.border}`,
                display: "flex",
                gap: 18,
                alignItems: "center",
              }}
            >
              {["M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", // image
                "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", // emoji
                "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", // location
              ].map((d, i) => (
                <svg
                  key={i}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={X.blue}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.7 }}
                >
                  <path d={d} />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Sending overlay */}
        {postClicked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              opacity: sendingOp,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `2.5px solid ${X.blue}30`,
                borderTop: `2.5px solid ${X.blue}`,
                transform: `rotate(${frame * 12}deg)`,
              }}
            />
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: X.text,
                fontFamily: C.font,
              }}
            >
              Posting...
            </span>
          </div>
        )}
      </div>

      {/* "everyone can reply" label below panel */}
      <div
        style={{
          position: "absolute",
          top: 118,
          left: 480,
          right: 480,
          transform: `translateY(${panelY}px)`,
          opacity: interpolate(frame, [14, 22], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          paddingTop: 8,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* Annotation: what each part does */}
        {frame >= 108 && (
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 24,
              opacity: interpolate(frame, [108, 116], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {[
              { label: "token name", color: C.white },
              { label: "ticker", color: C.green },
              { label: "fee config", color: C.cyan },
            ].map((tag) => (
              <div
                key={tag.label}
                style={{
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: `1px solid ${tag.color}25`,
                  backgroundColor: `${tag.color}0a`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: tag.color,
                  fontFamily: C.mono,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {tag.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 2 — REPLY (260 frames)
   Shows tweet thread: original tweet + bot reply with results
   ════════════════════════════════════════════════════════════ */

const MINT_ADDR = "7sLaXkWagm1nv1";
const TX_SHORT = "2xYk...aBcD";
const CONFIG_SHORT = "3zKm...xYzW";

const ReplyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transitions
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterBlur = interpolate(frame, [0, 12], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [325, 340], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [328, 340], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Processing steps (frames 10-90)
  const steps = [
    { label: "parsing tweet", start: 10 },
    { label: "uploading metadata", start: 25 },
    { label: "building transaction", start: 40 },
    { label: "signing", start: 55 },
    { label: "confirming on solana", start: 68 },
    { label: "configuring fee sharing", start: 82 },
  ];

  const currentStepIdx = steps.reduce(
    (acc, s, i) => (frame >= s.start ? i : acc),
    -1
  );

  // Bot reply entrance (after processing)
  const replyDelay = 105;
  const replyProgress = spring({
    frame: frame - replyDelay,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const replyY = interpolate(replyProgress, [0, 1], [40, 0]);
  const replyOp = interpolate(frame, [replyDelay - 2, replyDelay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success glow pulse
  const successGlow =
    frame >= 130 ? 0.3 + Math.sin((frame - 130) * 0.08) * 0.2 : 0;

  // Detail rows stagger
  const detailStart = replyDelay + 20;

  // Engagement metrics animate in
  const engageStart = replyDelay + 55;
  const engageOp = interpolate(frame, [engageStart, engageStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Vault link highlight
  const linkGlow =
    frame >= replyDelay + 70
      ? 0.5 + Math.sin((frame - replyDelay - 70) * 0.12) * 0.5
      : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #0a0e18 0%, ${C.dark} 65%)`,
        opacity: fadeIn * fadeOut,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 250, y: 200, size: 550, color: C.green, speed: 0.01, phase: 0 },
          { x: 1500, y: 500, size: 500, color: C.accent, speed: 0.013, phase: 2.5 },
          { x: 960, y: 800, size: 400, color: C.cyan, speed: 0.008, phase: 4 },
          { x: 1600, y: 150, size: 350, color: C.green, speed: 0.015, phase: 1.5 },
        ]}
      />

      {/* Ambient radial glow behind panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1200,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.green}08, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ═══ TWEET THREAD PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 420,
          right: 420,
          bottom: 60,
          borderRadius: 16,
          border: `1px solid ${X.border}`,
          backgroundColor: X.bg,
          boxShadow:
            "0 12px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03), 0 0 120px rgba(0,255,136,0.03)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Original tweet (condensed) ── */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${X.border}`,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {/* User avatar */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}40, ${C.green}30)`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
                color: C.white,
                fontFamily: C.font,
              }}
            >
              W
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: X.text,
                    fontFamily: C.font,
                  }}
                >
                  wagmi_dev
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: X.secondary,
                    fontFamily: C.font,
                  }}
                >
                  @wagmi_dev · just now
                </span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: X.text,
                  fontFamily: C.font,
                  lineHeight: 1.4,
                }}
              >
                <TweetTextHighlighted text={TWEET_TEXT} />
              </div>
            </div>
          </div>
          {/* Thread line */}
          <div
            style={{
              width: 2,
              height: 26,
              backgroundColor: X.border,
              marginLeft: 18,
              marginTop: 5,
            }}
          />
        </div>

        {/* ── Processing indicator ── */}
        {frame >= 10 && frame < replyDelay && (
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: `1px solid ${X.border}`,
            }}
          >
            <Img
              src={staticFile("anvil-mascot.png")}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${C.green}30`,
                  borderTop: `2px solid ${C.green}`,
                  transform: `rotate(${frame * 14}deg)`,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.green,
                  fontFamily: C.mono,
                }}
              >
                {currentStepIdx >= 0
                  ? steps[currentStepIdx].label
                  : "processing..."}
              </span>
            </div>
            {/* Step dots */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 4,
              }}
            >
              {steps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor:
                      i <= currentStepIdx ? C.green : `${C.green}20`,
                    boxShadow:
                      i <= currentStepIdx
                        ? `0 0 6px ${C.green}40`
                        : "none",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Bot reply ── */}
        {frame >= replyDelay - 2 && (
          <div
            style={{
              padding: "16px 20px",
              opacity: replyOp,
              transform: `translateY(${replyY}px)`,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {/* Bot avatar */}
              <Img
                src={staticFile("anvil-mascot.png")}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                {/* Name + verified */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: X.text,
                      fontFamily: C.font,
                    }}
                  >
                    Anvil Protocol
                  </span>
                  {/* Verified badge */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 22 22"
                    fill={X.blue}
                  >
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.087 1.24 1.44s1.167.551 1.813.568c.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.893.143.636-.131 1.222-.437 1.69-.884.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.9.584-.272 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                  </svg>
                  <span
                    style={{
                      fontSize: 13,
                      color: X.secondary,
                      fontFamily: C.font,
                    }}
                  >
                    @AnvilProtocol · now
                  </span>
                </div>

                {/* Reply content */}
                <div
                  style={{
                    fontSize: 15,
                    color: X.text,
                    fontFamily: C.mono,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {/* Line 1: token name */}
                  <ReplyLine frame={frame} delay={detailStart} index={0}>
                    <span style={{ fontWeight: 700 }}>Wagmi ($WAGMI)</span>{" "}
                    launched.
                  </ReplyLine>

                  {/* Line 2: blank */}
                  <ReplyLine frame={frame} delay={detailStart + 5} index={1}>
                    {"\n"}
                  </ReplyLine>

                  {/* Line 3: mint */}
                  <ReplyLine frame={frame} delay={detailStart + 8} index={2}>
                    mint:{" "}
                    <span style={{ color: C.green }}>{MINT_ADDR}</span>
                  </ReplyLine>

                  {/* Line 4: holders | split */}
                  <ReplyLine frame={frame} delay={detailStart + 14} index={3}>
                    holders:{" "}
                    <span style={{ color: C.cyan }}>200</span> | split:{" "}
                    <span style={{ color: C.cyan }}>75%</span>
                  </ReplyLine>

                  {/* Line 5: blank */}
                  <ReplyLine frame={frame} delay={detailStart + 18} index={4}>
                    {"\n"}
                  </ReplyLine>

                  {/* Line 6: launch tx */}
                  <ReplyLine frame={frame} delay={detailStart + 22} index={5}>
                    launch:{" "}
                    <span style={{ color: X.blue }}>{TX_SHORT}</span>
                  </ReplyLine>

                  {/* Line 7: config tx */}
                  <ReplyLine frame={frame} delay={detailStart + 26} index={6}>
                    config:{" "}
                    <span style={{ color: X.blue }}>{CONFIG_SHORT}</span>
                  </ReplyLine>

                  {/* Line 8: blank */}
                  <ReplyLine frame={frame} delay={detailStart + 30} index={7}>
                    {"\n"}
                  </ReplyLine>

                  {/* Line 9: vault link */}
                  <ReplyLine frame={frame} delay={detailStart + 34} index={8}>
                    <span
                      style={{
                        color: X.blue,
                        boxShadow:
                          linkGlow > 0
                            ? `0 0 ${12 * linkGlow}px ${C.green}20`
                            : "none",
                      }}
                    >
                      anvil-protocol.fun/vault/{MINT_ADDR.slice(0, 6)}...
                    </span>
                  </ReplyLine>
                </div>

                {/* Engagement bar */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 10,
                    borderTop: `1px solid ${X.border}`,
                    display: "flex",
                    gap: 36,
                    opacity: engageOp,
                  }}
                >
                  {[
                    {
                      icon: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
                      count: "12",
                      color: X.secondary,
                    },
                    {
                      icon: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
                      count: "47",
                      color: X.repost,
                    },
                    {
                      icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
                      count: "231",
                      color: X.like,
                    },
                  ].map((action, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={action.color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={action.icon} />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          color: action.color,
                          fontFamily: C.font,
                        }}
                      >
                        {action.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success glow border */}
        {frame >= 130 && (
          <div
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: 16,
              border: `1px solid ${C.green}${Math.round(successGlow * 40)
                .toString(16)
                .padStart(2, "0")}`,
              pointerEvents: "none",
              boxShadow: `0 0 ${40 * successGlow}px ${C.green}08`,
            }}
          />
        )}
      </div>

      {/* Bottom badges — what was configured from one tweet */}
      {frame >= replyDelay + 40 && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Main badge */}
          <div
            style={{
              opacity: interpolate(
                frame,
                [replyDelay + 40, replyDelay + 52],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              padding: "12px 28px",
              borderRadius: 12,
              border: `1px solid ${C.green}20`,
              backgroundColor: `${C.green}08`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.green}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: C.green,
                fontFamily: C.font,
              }}
            >
              token launched + vault created + fee sharing configured
            </span>
          </div>
          {/* Sub items */}
          <div
            style={{
              display: "flex",
              gap: 16,
              opacity: interpolate(
                frame,
                [replyDelay + 52, replyDelay + 64],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            {[
              "vanity mint (nv1)",
              "200 holder slots",
              "75% to holders",
            ].map((label) => (
              <div
                key={label}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: `1px solid ${C.cyan}18`,
                  backgroundColor: `${C.cyan}06`,
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.cyan,
                  fontFamily: C.mono,
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   SCENE 3 — END CARD (140 frames)
   ════════════════════════════════════════════════════════════ */
const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [145, 160], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing rings
  const ring1 = 0.8 + Math.sin(frame * 0.06) * 0.2;
  const ring2 = 0.8 + Math.sin(frame * 0.06 + 1.5) * 0.2;
  const ring3 = 0.8 + Math.sin(frame * 0.06 + 3) * 0.2;

  // Logo entrance (smooth, no slam)
  const logoProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [1.3, 1]);
  const logoOp = interpolate(frame, [10, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [10, 20], [6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA entrance
  const ctaProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 140 },
  });
  const ctaScale = interpolate(ctaProgress, [0, 1], [1.8, 1]);
  const ctaOp = interpolate(frame - 55, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL shimmer
  const urlShim = shimmerStyle(frame, 80, 25);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, #0e1020 0%, ${C.dark} 70%)`,
        opacity: fadeIn * fadeOut,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 400, y: 300, size: 600, color: C.green, speed: 0.008, phase: 0 },
          { x: 1200, y: 500, size: 500, color: C.accent, speed: 0.012, phase: 3 },
        ]}
      />

      {/* Pulsing rings */}
      {[ring1, ring2, ring3].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "45%",
            width: 200 + i * 100,
            height: 200 + i * 100,
            borderRadius: "50%",
            border: `1px solid ${C.green}${Math.round(r * 12)
              .toString(16)
              .padStart(2, "0")}`,
            transform: `translate(-50%, -50%) scale(${r})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Logo */}
      <div
        style={{
          opacity: logoOp,
          transform: `scale(${logoScale})`,
          filter: `blur(${logoBlur}px)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Img
          src={staticFile("anvil-mascot.png")}
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <span
          style={{
            fontSize: 52,
            fontWeight: 900,
            fontFamily: C.font,
            background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -2,
          }}
        >
          Anvil
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: interpolate(frame, [30, 42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(frame, [30, 42], [10, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
          fontSize: 30,
          fontWeight: 500,
          color: C.muted,
          fontFamily: C.font,
          textAlign: "center",
        }}
      >
        launch by tagging @AnvilProtocol
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaOp,
          transform: `scale(${ctaScale})`,
          marginTop: 16,
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "14px 36px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
            boxShadow: `0 4px 30px ${C.green}30, 0 0 60px ${C.green}10`,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.dark,
              fontFamily: C.font,
              letterSpacing: -0.5,
            }}
          >
            anvil-protocol.fun
          </span>
          {urlShim && <div style={urlShim} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ════════════════════════════════════════════════════════════ */

/** Renders tweet text with @mention and $TICKER highlighted */
const TweetTextHighlighted: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(@\w+|\$\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <span key={i} style={{ color: X.blue }}>
              {part}
            </span>
          );
        }
        if (part.startsWith("$")) {
          return (
            <span key={i} style={{ color: C.green, fontWeight: 700 }}>
              {part}
            </span>
          );
        }
        // Highlight "holders:" and "split:" params
        const paramHighlighted = part.replace(
          /(holders:\s*\d+|split:\s*\d+%?)/gi,
          "<<<$1>>>"
        );
        if (paramHighlighted.includes("<<<")) {
          const subParts = paramHighlighted.split(/(<<<.*?>>>)/g);
          return (
            <React.Fragment key={i}>
              {subParts.map((sub, j) => {
                if (sub.startsWith("<<<")) {
                  return (
                    <span key={j} style={{ color: C.cyan }}>
                      {sub.replace(/<<<|>>>/g, "")}
                    </span>
                  );
                }
                return sub;
              })}
            </React.Fragment>
          );
        }
        return part;
      })}
    </>
  );
};

/** Reply line with staggered fade-in */
const ReplyLine: React.FC<{
  frame: number;
  delay: number;
  index: number;
  children: React.ReactNode;
}> = ({ frame, delay, children }) => {
  const op = interpolate(frame, [delay, delay + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [delay, delay + 8], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity: op, transform: `translateX(${x}px)` }}>
      {children}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPOSITION
   ════════════════════════════════════════════════════════════ */

export const TagToLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <AbsoluteFill>
        {/* BGM */}
        <Audio src={staticFile("bgm-ai.mp3")} volume={0.4} />

        {/* ─── Scenes ─── */}
        <Sequence from={0} durationInFrames={160}>
          <IntroScene />
        </Sequence>
        <Sequence from={150} durationInFrames={270}>
          <ComposeScene />
        </Sequence>
        <Sequence from={410} durationInFrames={340}>
          <ReplyScene />
        </Sequence>
        <Sequence from={740} durationInFrames={160}>
          <EndCardScene />
        </Sequence>

        {/* ─── SFX ─── */}
        {/* Scene transitions: whoosh */}
        {[150, 410, 740].map((f) => (
          <Sequence key={`w-${f}`} from={f} durationInFrames={20}>
            <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.2} />
          </Sequence>
        ))}

        {/* Compose: typing */}
        <Sequence from={170} durationInFrames={80}>
          <Audio src={staticFile("sfx/type.mp3")} volume={0.12} />
        </Sequence>

        {/* Compose: image attach */}
        <Sequence from={268} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
        </Sequence>

        {/* Compose: post click */}
        <Sequence from={340} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.3} />
        </Sequence>

        {/* Reply: bot reply entrance */}
        <Sequence from={515} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
        </Sequence>

        {/* Reply: success */}
        <Sequence from={540} durationInFrames={30}>
          <Audio src={staticFile("sfx/success.mp3")} volume={0.3} />
        </Sequence>

      </AbsoluteFill>

      {/* Global overlays */}
      <AmbientParticles count={20} color={C.green} speed={0.7} />
      <Vignette intensity={0.6} />
      <ScanLines />
      <GrainOverlay />

    </AbsoluteFill>
  );
};
