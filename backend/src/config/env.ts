import dotenv from "dotenv";
dotenv.config();

export const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  crankerUrl: process.env.CRANKER_URL || "http://localhost:4001",
  crankerApiKey: process.env.CRANKER_API_KEY || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(","),
  defaultHolderSplitBps: parseInt(process.env.DEFAULT_HOLDER_SPLIT_BPS || "5000", 10),
  adminWallets: (process.env.ADMIN_WALLETS || "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean),
  vaultMasterKey: process.env.VAULT_MASTER_KEY || (() => {
    throw new Error("VAULT_MASTER_KEY env var is required");
  })(),
  custodialMasterKey: process.env.CUSTODIAL_MASTER_KEY || (() => {
    throw new Error("CUSTODIAL_MASTER_KEY env var is required");
  })(),
  botApiKey: process.env.BOT_API_KEY || "",
  privyAppId: process.env.PRIVY_APP_ID || "",
  privyAppSecret: process.env.PRIVY_APP_SECRET || "",
  maxBotLaunchesPerDay: parseInt(process.env.MAX_BOT_LAUNCHES_PER_DAY || "3", 10),
  vanitySuffix: process.env.VANITY_SUFFIX || "nv1",
};

if (process.env.NODE_ENV === "production" && config.crankerUrl.includes("localhost")) {
  console.warn("[anvil] WARNING: CRANKER_URL is localhost in production — set it to the Railway internal URL");
}
