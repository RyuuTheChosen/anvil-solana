import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3002", 10),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  crankerUrl: process.env.CRANKER_URL || "http://localhost:4001",
  crankerApiKey: process.env.CRANKER_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(","),
  adminWallets: new Set(
    (process.env.ADMIN_WALLETS || "").split(",").map((w) => w.trim()).filter(Boolean)
  ),
};

if (!config.anthropicApiKey) {
  console.warn("[chat] ANTHROPIC_API_KEY not set — chat endpoint will return 503");
}
