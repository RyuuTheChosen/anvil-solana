import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { AnvilIntro } from "./AnvilIntro";
import { TopHolderSlider } from "./scenes/TopHolderSlider";
import { FeeDistribution } from "./scenes/FeeDistribution";
import { AnalyticsShowcase } from "./scenes/AnalyticsShowcase";
import { LpAutomation } from "./scenes/LpAutomation";
import { PumpFunLaunch } from "./PumpFunLaunch";
import { HowToLaunch } from "./HowToLaunch";
import { CreateVaultVideo } from "./CreateVaultVideo";
import { VaultIntroIG } from "./VaultIntroIG";
import { AiLayer } from "./AiLayer";
import { DistributionFlow } from "./DistributionFlow";
import { PushDistribution } from "./PushDistribution";
import { TagToLaunch } from "./TagToLaunch";
import { HowLaunchingWorks } from "./HowLaunchingWorks";

loadFont();

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="AnvilIntro"
        component={AnvilIntro}
        durationInFrames={913}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TopHolderSlider"
        component={TopHolderSlider}
        durationInFrames={375}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeeDistribution"
        component={FeeDistribution}
        durationInFrames={480}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="AnalyticsShowcase"
        component={AnalyticsShowcase}
        durationInFrames={390}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LpAutomation"
        component={LpAutomation}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PumpFunLaunch"
        component={PumpFunLaunch}
        durationInFrames={480}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HowToLaunch"
        component={HowToLaunch}
        durationInFrames={690}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CreateVaultVideo"
        component={CreateVaultVideo}
        durationInFrames={690}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="VaultIntroIG"
        component={VaultIntroIG}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="AiLayer"
        component={AiLayer}
        durationInFrames={790}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DistributionFlow"
        component={DistributionFlow}
        durationInFrames={810}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PushDistribution"
        component={PushDistribution}
        durationInFrames={445}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TagToLaunch"
        component={TagToLaunch}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HowLaunchingWorks"
        component={HowLaunchingWorks}
        durationInFrames={1040}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
