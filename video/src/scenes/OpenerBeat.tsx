import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  staticFile,
} from "remotion";
import { C } from "../colors";

/* ═══════════════════ PARTICLES ═══════════════════ */

const Particles: React.FC<{ color?: string }> = ({
  color = "rgba(255,255,255,0.5)",
}) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: ((i * 137.508 * 7.3 + 50) % 100),
        y: ((i * 137.508 * 13.7 + 30) % 100),
        speed: 0.12 + (i % 5) * 0.06,
        size: 2 + (i % 3) * 1.5,
        opacity: 0.25 + (i % 4) * 0.12,
        phase: i * 2.4,
      })),
    []
  );
  return (
    <>
      {particles.map((p, i) => {
        const drift = Math.sin(frame * 0.018 + p.phase) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(${p.x}% + ${drift}px)`,
              top: `${((p.y + frame * p.speed) % 108) - 4}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: p.opacity,
            }}
          />
        );
      })}
    </>
  );
};

/* ═══════════════════ AURORA GLOW ═══════════════════ */

const Aurora: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame * 0.012) * 25;
  return (
    <div
      style={{
        position: "absolute",
        top: -80 + drift,
        left: -80,
        width: 550,
        height: 450,
        background: `radial-gradient(ellipse at 30% 40%, ${C.green}18, transparent 70%)`,
        filter: "blur(50px)",
      }}
    />
  );
};

/* ═══════════════════ PILL SHAPE ═══════════════════ */

const PillShape: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: "50%",
      left: "55%",
      transform: "translate(-50%, -50%) rotate(-35deg)",
      width: 700,
      height: 350,
      borderRadius: 175,
      backgroundColor: "rgba(0,0,0,0.08)",
    }}
  />
);

/* ═══════════════════ TWEET SNIPPET ═══════════════════ */

const TweetSnippet: React.FC<{
  lines: string[];
  highlightLine: number;
  highlightWord: string;
  rotate?: number;
  offsetX?: number;
  offsetY?: number;
}> = ({ lines, highlightLine, highlightWord, rotate = 0, offsetX = 0, offsetY = 0 }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 2], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#eeeee8" }}>
      {/* Subtle paper texture / vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.06) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 60px",
          transform: `scale(${scale}) rotate(${rotate}deg) translate(${offsetX}px, ${offsetY}px)`,
          transformOrigin: "50% 50%",
        }}
      >
        {lines.map((line, i) => {
          if (!line) return <div key={i} style={{ height: 20 }} />;

          const isHL = i === highlightLine;
          const distFromHL = Math.abs(i - highlightLine);
          const blurAmt = isHL ? 0 : 1.5 + distFromHL * 0.8;
          const textColor = isHL ? "#888" : `rgba(180,180,175,${1 - distFromHL * 0.15})`;

          if (isHL) {
            const idx = line.toLowerCase().indexOf(highlightWord.toLowerCase());
            const before = line.slice(0, idx);
            const match = line.slice(idx, idx + highlightWord.length);
            const after = line.slice(idx + highlightWord.length);

            return (
              <div
                key={i}
                style={{
                  fontSize: 84,
                  fontWeight: 800,
                  fontFamily: C.font,
                  color: textColor,
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                }}
              >
                {before && (
                  <span style={{ filter: "blur(0.8px)", color: "#b0b0a8" }}>
                    {before}
                  </span>
                )}
                <span
                  style={{
                    backgroundColor: C.green,
                    color: "#fff",
                    padding: "4px 16px",
                    borderRadius: 8,
                    fontWeight: 900,
                    boxShadow: `0 2px 20px ${C.green}40`,
                  }}
                >
                  {match}
                </span>
                {after && (
                  <span style={{ filter: "blur(0.8px)", color: "#b0b0a8" }}>
                    {after}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={i}
              style={{
                fontSize: 84,
                fontWeight: 700,
                fontFamily: C.font,
                color: textColor,
                lineHeight: 1.35,
                filter: `blur(${blurAmt}px)`,
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ KINETIC TEXT CARD ═══════════════════ */

const KineticCard: React.FC<{
  text: string;
  highlight?: string;
  type: "green" | "dark" | "gold";
}> = ({ text, highlight, type }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 220 },
  });
  const scale = interpolate(progress, [0, 1], [1.12, 1]);
  const opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isGreen = type === "green";
  const isGold = type === "gold";

  let textEl: React.ReactNode;

  if (isGold) {
    textEl = (
      <span
        style={{
          background: "linear-gradient(180deg, #ffd700, #ff8c00)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: `drop-shadow(0 0 40px rgba(255, 200, 0, 0.5)) drop-shadow(0 0 80px rgba(255, 160, 0, 0.3))`,
        }}
      >
        {text}
      </span>
    );
  } else if (highlight) {
    const idx = text.indexOf(highlight);
    const before = text.slice(0, idx);
    const after = text.slice(idx + highlight.length);
    textEl = (
      <>
        {before}
        <span style={{ color: C.green }}>{highlight}</span>
        {after}
      </>
    );
  } else {
    textEl = text;
  }

  return (
    <AbsoluteFill
      style={{ backgroundColor: isGreen ? C.green : C.dark, overflow: "hidden" }}
    >
      {isGreen ? <PillShape /> : <Aurora />}
      <Particles color={isGreen ? "rgba(255,255,255,0.35)" : undefined} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            fontSize: isGreen ? 130 : isGold ? 110 : 76,
            fontWeight: 800,
            fontFamily: C.font,
            color: isGreen ? "#1a3a1a" : "#fff",
            letterSpacing: isGreen ? -5 : -3,
            textAlign: "center",
          }}
        >
          {textEl}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ REWARDED + ZOOM PUNCH ═══════════════════ */

const RewardedZoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slam in
  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 220 },
  });
  const slamScale = interpolate(progress, [0, 1], [1.12, 1]);
  const slamOp = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Zoom-punch starts at frame 80
  const zoomStart = 80;
  const zoomDuration = 55;
  const zoomProgress = interpolate(
    frame,
    [zoomStart, zoomStart + zoomDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const punchZoom =
    frame < zoomStart ? slamScale : slamScale * (1 + Math.pow(zoomProgress, 2.5) * 25);
  const zoomBlur = Math.pow(zoomProgress, 1.5) * 40;
  const zoomBrightness = 1 + Math.pow(zoomProgress, 2) * 10;

  const flashOp = interpolate(
    frame,
    [zoomStart + zoomDuration - 18, zoomStart + zoomDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark, overflow: "hidden" }}>
      <Aurora />
      <Particles />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${punchZoom})`,
          filter:
            zoomProgress > 0
              ? `blur(${zoomBlur}px) brightness(${zoomBrightness})`
              : "none",
          opacity: slamOp,
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            fontFamily: C.font,
            letterSpacing: -3,
            textAlign: "center",
          }}
        >
          <span
            style={{
              background: "linear-gradient(180deg, #ffd700, #ff8c00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 40px rgba(255, 200, 0, 0.5)) drop-shadow(0 0 80px rgba(255, 160, 0, 0.3))`,
            }}
          >
            rewarded
          </span>
        </div>
      </div>

      {flashOp > 0 && (
        <AbsoluteFill
          style={{ backgroundColor: "#fff", opacity: flashOp, zIndex: 10 }}
        />
      )}
    </AbsoluteFill>
  );
};

/* ═══════════════════ LOGO CARD (green bg) ═══════════════════ */

const LogoCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });
  const scale = interpolate(progress, [0, 1], [1.2, 1]);
  const opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.green, overflow: "hidden" }}>
      {/* Anvil logo as background shape (replaces pill) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.12,
        }}
      >
        <Img
          src={staticFile("anvil-logo.png")}
          style={{ width: 900, height: "auto" }}
        />
      </div>
      <Particles color="rgba(255,255,255,0.35)" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            fontFamily: C.font,
            color: "#1a3a1a",
            letterSpacing: -5,
          }}
        >
          HOLDERS
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════ MAIN OPENER ═══════════════════ */
// Total duration: 335 frames (matches original ConversationBeat)

export const OpenerBeat: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* ── Part A: Tweet snippets (0-120, 9 frames / 0.3s each) ── */}
      <Sequence from={0} durationInFrames={9}>
        <TweetSnippet
          lines={["every launchpad just takes and takes", "someone needs to reward the holders", "not just extract from them"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.8} offsetX={-40} offsetY={20}
        />
      </Sequence>
      <Sequence from={9} durationInFrames={9}>
        <TweetSnippet
          lines={["nah fr the system is so broken", "why doesn't anyone reward the holders", "they create all the volume lmao"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.5} offsetX={30} offsetY={-15}
        />
      </Sequence>
      <Sequence from={18} durationInFrames={9}>
        <TweetSnippet
          lines={["imagine a launchpad that would", "actually reward the holders for once", "instead of just dumping on them"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.3} offsetX={-20} offsetY={10}
        />
      </Sequence>
      <Sequence from={27} durationInFrames={9}>
        <TweetSnippet
          lines={["hot take: protocols that don't", "reward the holders are ngmi", "it's literally free money left on the table"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.6} offsetX={20} offsetY={-25}
        />
      </Sequence>
      <Sequence from={36} durationInFrames={9}>
        <TweetSnippet
          lines={["trading fees go to devs pockets", "just reward the holders already", "how hard is that"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.5} offsetX={-30} offsetY={15}
        />
      </Sequence>
      <Sequence from={45} durationInFrames={9}>
        <TweetSnippet
          lines={["the meta is shifting. you either", "reward the holders or get left behind", "simple as that"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.4} offsetX={15} offsetY={-10}
        />
      </Sequence>
      <Sequence from={54} durationInFrames={9}>
        <TweetSnippet
          lines={["been saying this for months", "reward the holders with trading fees", "that's the only sustainable model"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.7} offsetX={-25} offsetY={20}
        />
      </Sequence>
      <Sequence from={63} durationInFrames={9}>
        <TweetSnippet
          lines={["every token launch should", "reward the holders automatically", "not just promise and rug"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.3} offsetX={35} offsetY={-20}
        />
      </Sequence>
      <Sequence from={72} durationInFrames={9}>
        <TweetSnippet
          lines={["if you're building a launchpad", "reward the holders or don't bother", "we're tired of getting nothing"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.4} offsetX={-15} offsetY={5}
        />
      </Sequence>
      <Sequence from={81} durationInFrames={9}>
        <TweetSnippet
          lines={["someone build this already", "reward the holders", "it's literally that simple"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.2} offsetX={10} offsetY={-5}
        />
      </Sequence>
      <Sequence from={90} durationInFrames={9}>
        <TweetSnippet
          lines={["devs make millions off launches", "but never reward the holders", "how is this still the norm"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.6} offsetX={-35} offsetY={18}
        />
      </Sequence>
      <Sequence from={99} durationInFrames={9}>
        <TweetSnippet
          lines={["the future of token launches is to", "reward the holders with real yield", "from actual trading volume"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={0.7} offsetX={25} offsetY={-12}
        />
      </Sequence>
      <Sequence from={108} durationInFrames={12}>
        <TweetSnippet
          lines={["say it louder for the devs", "reward the holders", "holders deserve better"]}
          highlightLine={1} highlightWord="reward the holders"
          rotate={-0.2} offsetX={-10} offsetY={8}
        />
      </Sequence>

      {/* ── Part B: Kinetic text cards (120-) ── */}
      <Sequence from={120} durationInFrames={28}>
        <LogoCard />
      </Sequence>

      <Sequence from={148} durationInFrames={20}>
        <KineticCard text="it's time" type="dark" />
      </Sequence>

      <Sequence from={168} durationInFrames={22}>
        <KineticCard text="for you to get" highlight="get" type="dark" />
      </Sequence>

      <Sequence from={190} durationInFrames={23}>
        <KineticCard text="what you deserve" highlight="deserve" type="dark" />
      </Sequence>

      {/* ── Part C: "rewarded" + zoom-punch (213-348) ── */}
      <Sequence from={213} durationInFrames={135}>
        <RewardedZoom />
      </Sequence>
    </AbsoluteFill>
  );
};
