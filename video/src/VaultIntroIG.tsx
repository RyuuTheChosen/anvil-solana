import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, staticFile } from "remotion";
import { ChatScene } from "./ig/ChatScene";
import { DashboardScene } from "./ig/DashboardScene";
import { CreateVaultScene } from "./ig/CreateVaultScene";
import { FlowScene } from "./ig/FlowScene";
import { EndCard } from "./ig/EndCard";
import { GrainOverlay, ScanLines } from "./ig/shared";
import { C } from "./colors";

export const VaultIntroIG: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <Audio src={staticFile("bgm.mp3")} volume={0.5} />
      <Sequence from={0} durationInFrames={260}>
        <ChatScene />
      </Sequence>
      <Sequence from={250} durationInFrames={170}>
        <DashboardScene />
      </Sequence>
      <Sequence from={410} durationInFrames={190}>
        <CreateVaultScene />
      </Sequence>
      <Sequence from={590} durationInFrames={160}>
        <FlowScene />
      </Sequence>
      <Sequence from={740} durationInFrames={160}>
        <EndCard />
      </Sequence>

      {/* Global overlays — always on top */}
      <ScanLines />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
