import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  Audio,
  staticFile,
} from "remotion";
import { C } from "./colors";

/*
 * ANVIL — "Live on PumpFun" hype clip
 * 1920x1080, 30fps, 450 frames (~15s)
 *
 * Scene 1: Hook       (0–100)    Green bg, logo in dark card
 * Scene 2: Explorer   (100–330)  Floating panel with vault list
 * Scene 3: CTA        (330–450)  Green bg + "Launch now on Anvil"
 */

const GREEN_BG = "linear-gradient(160deg, #00ff88, #00cc66 40%, #0a3d2a 100%)";

/* ───────────── Scene 1: Hook ───────────── */

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo appears small + blurry, sharpens
  const logoOp = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoBlur = interpolate(frame, [8, 32], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoSize = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 40 },
  });
  const logoSizePx = interpolate(logoSize, [0, 1], [45, 85]);

  // Dark rounded card forms behind logo
  const cardScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const cardOp = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalLogoSize = interpolate(frame, [30, 48], [logoSizePx, 78], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const resolvedLogoSize = frame < 30 ? logoSizePx : finalLogoSize;

  // Scene fade out
  const fadeOut = interpolate(frame, [85, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Green background */}
      <AbsoluteFill style={{ background: GREEN_BG }} />

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Dark rounded card */}
        <div
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: 32,
            backgroundColor: C.dark,
            opacity: cardOp,
            transform: `scale(${cardScale})`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            opacity: logoOp,
            filter: `blur(${logoBlur}px)`,
            zIndex: 1,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: resolvedLogoSize, height: resolvedLogoSize }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── Scene 2: Launch Dashboard ───────────── */

/** Typewriter text */
const TypeText: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  endFrame: number;
}> = ({ text, frame, startFrame, endFrame }) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chars = Math.floor(progress * text.length);
  const show = text.substring(0, chars);
  const showCaret = progress > 0 && progress < 1;
  return (
    <>
      {show}
      {showCaret && <span style={{ color: C.green, fontWeight: 300 }}>|</span>}
    </>
  );
};

const SceneLaunchDash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel slides up
  const panelY = interpolate(frame, [5, 30], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelOp = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 16, stiffness: 50 },
  });

  // Header
  const headerOp = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Image placeholder
  const imgOp = interpolate(frame, [20, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  // Name field
  const nameFieldOp = interpolate(frame, [25, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Symbol field
  const symbolFieldOp = interpolate(frame, [32, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fee split section
  const feeOp = interpolate(frame, [70, 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const feeY = interpolate(frame, [70, 82], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Slider thumb animates to position
  const sliderPos = interpolate(frame, [85, 105], [0, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const holderPct = sliderPos * 0.95;
  const lpPct = (100 - sliderPos) * 0.95;

  // Vanity mint
  const mintOp = interpolate(frame, [110, 122], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mintY = interpolate(frame, [110, 122], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkOp = interpolate(frame, [125, 132], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Launch button
  const btnOp = interpolate(frame, [135, 148], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const btnScale = spring({
    frame: frame - 135,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  // Click glow at frame 160
  const clickGlow = interpolate(frame, [160, 168, 180], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene fade out
  const fadeOut = interpolate(frame, [200, 220], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: C.muted,
    fontFamily: C.font,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  };

  const fieldStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${C.borderLight}`,
    backgroundColor: C.dark,
    fontSize: 14,
    fontWeight: 500,
    color: C.white,
    fontFamily: C.font,
    minHeight: 20,
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          opacity: panelOp,
          transform: `translateY(${panelY}px) scale(${panelScale})`,
          width: 580,
          borderRadius: 28,
          border: `1px solid ${C.border}`,
          backgroundColor: C.card,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOp,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 28px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Img src={staticFile("logo.svg")} style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.font }}>
              Launch Token
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: C.green,
                boxShadow: `0 0 8px ${C.green}`,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.font }}>
              Mainnet
            </span>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {/* Token info row: image + fields */}
          <div style={{ display: "flex", gap: 18, marginBottom: 22 }}>
            {/* Image placeholder */}
            <div
              style={{
                opacity: imgOp,
                transform: `scale(${imgScale})`,
                width: 88,
                height: 88,
                borderRadius: 16,
                border: `2px dashed ${C.borderLight}`,
                backgroundColor: C.dark,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: 8, color: C.muted, fontFamily: C.font, marginTop: 4 }}>Image</span>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ opacity: nameFieldOp }}>
                <div style={labelStyle}>Token Name</div>
                <div style={fieldStyle}>
                  <TypeText text="Moon Cat" frame={frame} startFrame={38} endFrame={58} />
                </div>
              </div>
              <div style={{ opacity: symbolFieldOp }}>
                <div style={labelStyle}>Symbol</div>
                <div style={fieldStyle}>
                  <TypeText text="MCAT" frame={frame} startFrame={52} endFrame={65} />
                </div>
              </div>
            </div>
          </div>

          {/* Fee split */}
          <div
            style={{
              opacity: feeOp,
              transform: `translateY(${feeY}px)`,
              marginBottom: 20,
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 10 }}>Fee Distribution</div>

            {/* Slider bar */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div
                style={{
                  width: "100%",
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: C.dark,
                  display: "flex",
                  overflow: "visible",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${holderPct}%`,
                    height: "100%",
                    backgroundColor: C.green,
                    borderRadius: holderPct >= 94 ? 6 : "6px 0 0 6px",
                    boxShadow: holderPct > 1 ? `0 0 10px ${C.green}40` : "none",
                  }}
                />
                <div
                  style={{
                    width: `${lpPct}%`,
                    height: "100%",
                    backgroundColor: C.cyan,
                    borderRadius: lpPct >= 94 ? 6 : "0 6px 6px 0",
                    marginLeft: "auto",
                    boxShadow: lpPct > 1 ? `0 0 10px ${C.cyan}40` : "none",
                  }}
                />
                {/* Thumb */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: `${sliderPos}%`,
                    transform: "translate(-50%, -50%)",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    backgroundColor: C.white,
                    border: `2px solid ${C.dark}`,
                    boxShadow: `0 2px 8px rgba(0,0,0,0.5)`,
                  }}
                />
              </div>
            </div>

            {/* Labels */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.font }}>
                  Holders {holderPct.toFixed(0)}%
                </span>
              </span>
              <span style={{ fontSize: 10, color: C.pink, fontFamily: C.font, fontWeight: 600 }}>
                5% fee
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.cyan }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.cyan, fontFamily: C.font }}>
                  LP {lpPct.toFixed(0)}%
                </span>
              </span>
            </div>
          </div>

          {/* Vanity mint preview */}
          <div
            style={{
              opacity: mintOp,
              transform: `translateY(${mintY}px)`,
              marginBottom: 20,
              padding: "12px 16px",
              borderRadius: 12,
              backgroundColor: C.dark,
              border: `1px solid ${C.borderLight}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={labelStyle}>Vanity Mint Address</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.white, fontFamily: C.mono }}>
                7xK4mP9...
                <span style={{ color: C.green }}>nv1</span>
              </span>
            </div>
            <div
              style={{
                opacity: checkOp,
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: `${C.green}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Launch button */}
          <div
            style={{
              opacity: btnOp,
              transform: `scale(${btnScale})`,
              padding: "14px 0",
              borderRadius: 14,
              backgroundColor: C.green,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 700,
              color: C.dark,
              fontFamily: C.font,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: `0 0 ${20 + clickGlow * 40}px rgba(0,255,136,${0.15 + clickGlow * 0.4})`,
            }}
          >
            Launch Token
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── Scene 3: Logo → BG pop → "Launch on Anvil" ───────────── */

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Logo appears on dark bg (0-30)
  const logoScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const logoOp = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Green bg pops out from center (30-55)
  const bgPop = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 40 },
  });
  // Scale a circle from 0 to large enough to cover 1920x1080
  const bgCircleScale = interpolate(bgPop, [0, 1], [0, 1]);

  // URL fades in after bg settles
  const urlOp = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlY = interpolate(frame, [50, 65], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: Logo + URL fade out (75-90)
  const logoGroupOp = interpolate(frame, [75, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 4: "Launch on Anvil" fades in (95-115)
  const textOp = interpolate(frame, [95, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [95, 115], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      {/* Green bg circle expanding from center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 2400,
          height: 2400,
          borderRadius: "50%",
          background: GREEN_BG,
          transform: `translate(-50%, -50%) scale(${bgCircleScale})`,
          transformOrigin: "center",
        }}
      />

      {/* Logo + URL (stays centered, fades out) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoGroupOp,
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: logoOp,
            transform: `scale(${logoScale})`,
            marginBottom: 20,
          }}
        >
          <Img
            src={staticFile("logo.svg")}
            style={{ width: 90, height: 90 }}
          />
        </div>

        <div
          style={{
            opacity: urlOp,
            transform: `translateY(${urlY}px)`,
            fontSize: 19,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            fontFamily: C.font,
          }}
        >
          anvil-protocol.fun
        </div>
      </div>

      {/* "Launch on Anvil" */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: textOp,
            transform: `translateY(${textY}px)`,
            fontSize: 52,
            fontWeight: 700,
            color: C.white,
            fontFamily: C.font,
            letterSpacing: -1,
          }}
        >
          Launch on Anvil
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ MAIN COMPOSITION ═══════════════════ */

export const PumpFunLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Audio src={staticFile("bgm-pump.mp3")} volume={0.8} />

      <Sequence from={0} durationInFrames={100}>
        <SceneHook />
      </Sequence>

      <Sequence from={100} durationInFrames={230}>
        <SceneLaunchDash />
      </Sequence>

      <Sequence from={330} durationInFrames={150}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
