import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[bot:config] FATAL: Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  // Twitter API
  twitterBearerToken: requireEnv("TWITTER_BEARER_TOKEN"),
  twitterApiKey: requireEnv("TWITTER_API_KEY"),
  twitterApiSecret: requireEnv("TWITTER_API_SECRET"),
  twitterAccessToken: requireEnv("TWITTER_ACCESS_TOKEN"),
  twitterAccessSecret: requireEnv("TWITTER_ACCESS_SECRET"),
  twitterBotUserId: requireEnv("TWITTER_BOT_USER_ID"),

  // Backend
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",
  botApiKey: requireEnv("BOT_API_KEY"),

  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Claude AI
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),

  // Config
  maxLaunchesPerDay: parseInt(process.env.MAX_LAUNCHES_PER_DAY || "3", 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "15000", 10),
  port: parseInt(process.env.PORT || "3003", 10),
};
