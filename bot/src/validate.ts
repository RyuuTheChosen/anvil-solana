// ─── Sanitization ───────────────────────────────────────────────────────────

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069\u00AD]/g;
const CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]/g;

export function sanitizeString(input: string, maxLen: number): string {
  let s = input.normalize("NFC");
  s = s.replace(INVISIBLE_CHARS, "");
  s = s.replace(CONTROL_CHARS, "");
  return s.trim().slice(0, maxLen);
}

export function stripMentionsAndUrls(text: string): string {
  return text
    .replace(/@\w+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

// ─── Parsed Launch Interface ────────────────────────────────────────────────

export interface ParsedLaunch {
  name: string;
  symbol: string;
  description: string;
  devBuySol: number;
  maxHolders: number;
  holderSplitBps: number;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateSymbol(symbol: string): boolean {
  return /^[A-Z0-9]{1,10}$/.test(symbol);
}

function validateName(name: string): boolean {
  const sanitized = sanitizeString(name, 32);
  if (sanitized.length < 1) return false;
  // Reject mixed scripts (e.g., Latin + Cyrillic in same string)
  const hasLatin = /[a-zA-Z]/.test(sanitized);
  const hasCyrillic = /[\u0400-\u04FF]/.test(sanitized);
  const hasGreek = /[\u0370-\u03FF]/.test(sanitized);
  if (hasLatin && (hasCyrillic || hasGreek)) return false;
  return true;
}

export function validateLaunchParams(parsed: unknown): ParsedLaunch | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  // Check for error response from Claude
  if (p.error) return null;

  // Name
  if (typeof p.name !== "string") return null;
  const name = sanitizeString(p.name, 32);
  if (!validateName(name)) return null;

  // Symbol
  if (typeof p.symbol !== "string") return null;
  const symbol = sanitizeString(p.symbol, 10).toUpperCase();
  if (!validateSymbol(symbol)) return null;

  // Description
  const description = typeof p.description === "string" && sanitizeString(p.description, 500).length > 0
    ? sanitizeString(p.description, 500)
    : `${name} token`;

  // devBuySol — clamp to 0-85
  let devBuySol = 0;
  if (typeof p.devBuySol === "number" && Number.isFinite(p.devBuySol)) {
    devBuySol = Math.max(0, Math.min(85, p.devBuySol));
  }

  // maxHolders — clamp to 100-512
  let maxHolders = 100;
  if (typeof p.maxHolders === "number" && Number.isFinite(p.maxHolders)) {
    maxHolders = Math.max(100, Math.min(512, Math.round(p.maxHolders)));
  }

  // holderSplitBps — clamp to 0-10000
  let holderSplitBps = 5000;
  if (typeof p.holderSplitBps === "number" && Number.isFinite(p.holderSplitBps)) {
    holderSplitBps = Math.max(0, Math.min(10000, Math.round(p.holderSplitBps)));
  }

  return { name, symbol, description, devBuySol, maxHolders, holderSplitBps };
}
