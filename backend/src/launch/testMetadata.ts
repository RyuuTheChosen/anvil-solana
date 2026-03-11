/**
 * Test metadata upload to PumpFun's IPFS endpoint.
 * Run: npx tsx src/launch/testMetadata.ts
 */
import path from "path";
import { uploadMetadata } from "./metadataUploader";

async function main() {
  console.log("=== Metadata Upload Test ===\n");

  const imagePath = path.resolve(__dirname, "../../test-assets/test.png");
  console.log("Image path:", imagePath);

  const result = await uploadMetadata(imagePath, {
    name: "Anvil Protocol Test",
    symbol: "AVTEST",
    description: "Testing Anvil Protocol metadata upload to IPFS",
    twitter: "https://x.com/anvilprotocol",
    website: "https://anvilprotocol.io",
  });

  console.log("\nUpload result:");
  console.log("  Metadata URI:", result.metadataUri);
  console.log("  Image URI:", result.imageUri);
  console.log("\n=== Test passed ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
