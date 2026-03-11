export type Command = "launch" | "balance" | "wallet" | "help" | "unknown";

/**
 * Layer 2 security: deterministic string-match routing. No AI.
 * Strip @mentions, lowercase, first keyword wins.
 */
export function routeCommand(rawText: string): Command {
  const text = rawText
    .replace(/@\w+/g, "")
    .toLowerCase()
    .trim();

  // Launch commands
  if (/\b(launch|deploy|create)\b/.test(text)) return "launch";

  // Balance check
  if (/\b(balance|bal)\b/.test(text)) return "balance";

  // Wallet lookup
  if (/\b(wallet|address)\b/.test(text)) return "wallet";

  // Explicit help
  if (/\b(help|commands?)\b/.test(text)) return "help";

  // No recognized command — ignore
  return "unknown";
}
