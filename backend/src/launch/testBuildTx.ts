import { Keypair } from "@solana/web3.js";
import { buildLaunchInstructions, buildConfigureInstructions } from "./buildTransaction";

async function main() {
  console.log("=== Build Instructions Test ===\n");

  const creator = Keypair.generate();
  const mint = Keypair.generate();

  console.log("Test 1: Launch (no dev buy)...");
  const r1 = await buildLaunchInstructions({
    creator: creator.publicKey,
    mint: mint.publicKey,
    name: "Test Token",
    symbol: "TST",
    metadataUri: "https://ipfs.io/ipfs/QmTest123",
  });
  console.log(`  Mint: ${r1.mint}`);
  console.log(`  Instructions: ${r1.instructionSet.instructions.length}, mintMustSign=${r1.instructionSet.mintMustSign}`);

  const mint2 = Keypair.generate();
  console.log("\nTest 2: Launch (with dev buy)...");
  const r2 = await buildLaunchInstructions({
    creator: creator.publicKey,
    mint: mint2.publicKey,
    name: "Test Token 2",
    symbol: "TST2",
    metadataUri: "https://ipfs.io/ipfs/QmTest456",
    devBuySol: 0.1,
  });
  console.log(`  Mint: ${r2.mint}`);
  console.log(`  Instructions: ${r2.instructionSet.instructions.length}, mintMustSign=${r2.instructionSet.mintMustSign}`);

  console.log("\nTest 3: Configure (fee sharing + vault)...");
  const r3 = await buildConfigureInstructions({
    creator: creator.publicKey,
    mint: mint.publicKey,
  });
  console.log(`  Instructions: ${r3.instructionSet.instructions.length}, mintMustSign=${r3.instructionSet.mintMustSign}`);
  console.log(`  Fee Account: ${r3.feeAccount}`);

  console.log("\n=== All tests passed ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
