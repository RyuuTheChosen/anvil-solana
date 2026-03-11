import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { AiIntroScene } from "./scenes/AiIntroScene";
import { AiHookScene } from "./scenes/AiHookScene";
import { AiDualModeScene } from "./scenes/AiDualModeScene";
import { AiToolUseScene } from "./scenes/AiToolUseScene";
import { AiActionScene } from "./scenes/AiActionScene";
import { AiFeatureGrid } from "./scenes/AiFeatureGrid";
import { AiEndCard } from "./scenes/AiEndCard";
import { GrainOverlay, ScanLines, Vignette, AmbientParticles } from "./ig/shared";
import { C } from "./colors";

/*
 * AI LAYER — ~26s composition (790 frames @ 30fps)
 *
 * Scene 0: AiIntroScene    (0-75)      — Logo × Mascot + "Introducing the AI Layer"
 * Scene 1: AiHookScene     (65-155)    — Typed prompt + streaming reply
 * Scene 2: AiDualModeScene (145-285)   — Split: onboarding vs. helper panel
 * Scene 3: AiToolUseScene  (275-445)   — Tool cards fan out + merge → response
 * Scene 4: AiActionScene   (435-595)   — TransactionPreview state machine
 * Scene 5: AiFeatureGrid   (585-685)   — 6 capability cards slam in
 * Scene 6: AiEndCard       (675-790)   — Logo + tagline + CTA
 */

export const AiLayer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <AbsoluteFill>
        {/* BGM */}
        <Audio src={staticFile("bgm-ai.mp3")} volume={0.45} />

        {/* ─── Scenes ─── */}
        <Sequence from={0} durationInFrames={75}>
          <AiIntroScene />
        </Sequence>
        <Sequence from={65} durationInFrames={90}>
          <AiHookScene />
        </Sequence>
        <Sequence from={145} durationInFrames={140}>
          <AiDualModeScene />
        </Sequence>
        <Sequence from={275} durationInFrames={170}>
          <AiToolUseScene />
        </Sequence>
        <Sequence from={435} durationInFrames={160}>
          <AiActionScene />
        </Sequence>
        <Sequence from={585} durationInFrames={100}>
          <AiFeatureGrid />
        </Sequence>
        <Sequence from={675} durationInFrames={115}>
          <AiEndCard />
        </Sequence>

        {/* ─── SFX ─── */}
        {/* Intro: logo slam */}
        <Sequence from={5} durationInFrames={30}>
          <Audio src={staticFile("sfx/slam.mp3")} volume={0.35} />
        </Sequence>

        {/* Scene transitions: whoosh */}
        {[65, 145, 275, 435, 585, 675].map((f) => (
          <Sequence key={`w-${f}`} from={f} durationInFrames={20}>
            <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.2} />
          </Sequence>
        ))}

        {/* Hook: typing sound */}
        <Sequence from={77} durationInFrames={20}>
          <Audio src={staticFile("sfx/type.mp3")} volume={0.15} />
        </Sequence>

        {/* Hook: response pop */}
        <Sequence from={103} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
        </Sequence>

        {/* DualMode: panels enter */}
        <Sequence from={150} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.2} />
        </Sequence>

        {/* ToolUse: response card */}
        <Sequence from={363} durationInFrames={15}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
        </Sequence>

        {/* Action: success */}
        <Sequence from={540} durationInFrames={30}>
          <Audio src={staticFile("sfx/success.mp3")} volume={0.35} />
        </Sequence>

        {/* FeatureGrid: title slam */}
        <Sequence from={588} durationInFrames={30}>
          <Audio src={staticFile("sfx/slam.mp3")} volume={0.25} />
        </Sequence>

        {/* EndCard: logo slam */}
        <Sequence from={680} durationInFrames={30}>
          <Audio src={staticFile("sfx/slam.mp3")} volume={0.3} />
        </Sequence>

        {/* EndCard: CTA chime */}
        <Sequence from={763} durationInFrames={30}>
          <Audio src={staticFile("sfx/chime.mp3")} volume={0.35} />
        </Sequence>
      </AbsoluteFill>

      {/* Global overlays */}
      <AmbientParticles count={25} color={C.green} speed={0.8} />
      <Vignette intensity={0.65} />
      <ScanLines />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
