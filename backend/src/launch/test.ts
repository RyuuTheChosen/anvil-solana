/**
 * Test script: verifies that PumpFun SDK can build a create token TX.
 *
 * Run: npm run launch:test
 *
 * Dry run by default — builds the TX but doesn't send.
 * Set SEND_TX=1 and provide CREATOR_PRIVATE_KEY to actually send.
 */
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import { PumpSdk, OnlinePumpSdk } from "@pump-fun/pump-sdk";
import bs58 from "bs58";
import { config } from "../config/env";

async function main() {
  console.log("=== PumpFun SDK Launch Test ===\n");

  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  console.log("RPC:", config.solanaRpcUrl);

  const sdk = new PumpSdk();
  const onlineSdk = new OnlinePumpSdk(connection);
  console.log("SDK initialized\n");

  // Fetch global state to verify SDK + RPC work
  console.log("Fetching PumpFun global state...");
  const global = await onlineSdk.fetchGlobal();
  console.log("Global state fetched:");
  console.log("  - Fee basis points:", global.feeBasisPoints?.toString());
  console.log("  - Creator fee bps:", global.creatorFeeBasisPoints?.toString());
  console.log("  - Token total supply:", global.tokenTotalSupply?.toString());
  console.log("");

  // Generate test keypairs
  const mintKeypair = Keypair.generate();
  const creatorKey = process.env.CREATOR_PRIVATE_KEY;
  const testCreator = creatorKey
    ? Keypair.fromSecretKey(bs58.decode(creatorKey))
    : Keypair.generate();

  console.log("Test mint:", mintKeypair.publicKey.toBase58());
  console.log("Test creator:", testCreator.publicKey.toBase58());
  console.log("");

  // Build create instruction (dry run)
  console.log("Building create instruction...");
  const ix = await sdk.createInstruction({
    mint: mintKeypair.publicKey,
    name: "Anvil Protocol Test",
    symbol: "PSTEST",
    uri: "https://example.com/metadata.json",
    creator: testCreator.publicKey,
    user: testCreator.publicKey,
  });

  console.log("Instruction built:");
  console.log("  - Program:", ix.programId.toBase58());
  console.log("  - Keys:", ix.keys.length);

  const tx = new Transaction().add(ix);
  tx.feePayer = testCreator.publicKey;

  console.log("Transaction assembled:");
  console.log("  - Instructions:", tx.instructions.length);
  console.log("  - Fee payer:", tx.feePayer.toBase58());

  // Only send if explicitly requested
  if (process.env.SEND_TX === "1" && creatorKey) {
    console.log("\nSending transaction...");
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(testCreator, mintKeypair);
    const sig = await connection.sendRawTransaction(tx.serialize());
    console.log("Signature:", sig);
  } else {
    console.log("\nDry run complete. Set SEND_TX=1 + CREATOR_PRIVATE_KEY to send.");
  }

  console.log("\n=== Test passed ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
