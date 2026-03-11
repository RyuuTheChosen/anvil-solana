import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { C } from "./colors";
import { ScanLines, GrainOverlay } from "./ig/shared";
import { DistHookScene } from "./scenes/DistHookScene";
import { DistCollectScene } from "./scenes/DistCollectScene";
import { DistDripScene } from "./scenes/DistDripScene";
import { DistSplitScene } from "./scenes/DistSplitScene";
import { DistScoreScene } from "./scenes/DistScoreScene";
import { DistPushScene } from "./scenes/DistPushScene";
import { DistStatsScene } from "./scenes/DistStatsScene";
import { DistEndCard } from "./scenes/DistEndCard";

/*
 * DistributionFlow — Kinetic typography video
 * Explains how Anvil's distribution system works.
 *
 * Scene map (10-frame overlaps for crossfade):
 *   Hook:    0–100
 *   Collect: 90–210
 *   Drip:    200–340
 *   Split:   330–480
 *   Score:   470–600
 *   Push:    590–720
 *   Stats:   710–770
 *   EndCard: 760–810
 *
 * Total: 810 frames / 27s @ 30fps
 */

export const DistributionFlow: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Sequence from={0} durationInFrames={100}>
        <DistHookScene />
      </Sequence>

      <Sequence from={90} durationInFrames={120}>
        <DistCollectScene />
      </Sequence>

      <Sequence from={200} durationInFrames={140}>
        <DistDripScene />
      </Sequence>

      <Sequence from={330} durationInFrames={150}>
        <DistSplitScene />
      </Sequence>

      <Sequence from={470} durationInFrames={130}>
        <DistScoreScene />
      </Sequence>

      <Sequence from={590} durationInFrames={130}>
        <DistPushScene />
      </Sequence>

      <Sequence from={710} durationInFrames={60}>
        <DistStatsScene />
      </Sequence>

      <Sequence from={760} durationInFrames={50}>
        <DistEndCard />
      </Sequence>

      {/* Global overlays */}
      <ScanLines />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
