const API_BASE = import.meta.env.VITE_API_URL || "";

const CSRF_HEADER = "X-Requested-With";
const CSRF_VALUE = "AnvilProtocol";

/**
 * Fetch wrapper that automatically adds CSRF and Content-Type headers.
 * Handles both JSON and FormData bodies.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set(CSRF_HEADER, CSRF_VALUE);

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

/**
 * Authenticated API fetch — includes Privy access token.
 * Use for custodial wallet operations (sign-and-submit, wallet/me, etc.)
 */
export async function authApiFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set(CSRF_HEADER, CSRF_VALUE);
  headers.set("Authorization", `Bearer ${token}`);

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

/**
 * Sign and submit a transaction via the custodial wallet backend.
 * Handles both serialized TX (vanity path) and instruction set (fallback).
 */
export async function custodialSignAndSubmit(
  token: string,
  body: { serializedTx?: string; instructionSet?: unknown; mintSecretKey?: string }
): Promise<{ signature: string }> {
  const res = await authApiFetch("/api/wallet/sign-and-submit", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Sign and submit failed" }));
    throw new Error(err.error || "Sign and submit failed");
  }
  return res.json();
}

/**
 * Sign and submit a claim via the custodial wallet backend.
 */
export async function custodialClaimSignAndSubmit(
  token: string,
  mint: string
): Promise<{ signature: string }> {
  const res = await authApiFetch("/api/claims/sign-and-submit", token, {
    method: "POST",
    body: JSON.stringify({ mint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Claim failed" }));
    throw new Error(err.error || "Claim failed");
  }
  return res.json();
}

/**
 * Sign and submit a close vault TX via the custodial wallet backend.
 */
export async function custodialCloseVaultSignAndSubmit(
  token: string,
  mint: string
): Promise<{ signature: string }> {
  const res = await authApiFetch("/api/vault/close-sign-and-submit", token, {
    method: "POST",
    body: JSON.stringify({ mint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Close vault failed" }));
    throw new Error(err.error || "Close vault failed");
  }
  return res.json();
}

// Patterns that indicate a leaked internal error
const INTERNAL_PATTERNS = [
  /at\s+\S+\s+\(/i,          // stack frame: "at Object.<anonymous> ("
  /\/[a-z][\w/-]+\.\w+/i,    // unix file path: /home/user/file.ts
  /[A-Z]:\\[\w\\]+/i,         // windows file path: C:\Users\...
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b.*\b(FROM|INTO|SET|VALUES)\b/i, // SQL
  /node_modules\//,
  /ERR_[A-Z_]+/,              // Node.js error codes
];

/**
 * Sanitize error messages before displaying to users.
 * Passes through clean wallet/user-facing messages unchanged.
 * Strips and truncates messages that look like leaked internals.
 */
export function sanitizeError(msg: string): string {
  if (!msg) return "An unexpected error occurred";

  const looksInternal = INTERNAL_PATTERNS.some((p) => p.test(msg));
  if (!looksInternal) return msg;

  // Extract first line (before any stack trace)
  const firstLine = msg.split("\n")[0].trim();

  // Remove file paths from the first line
  const cleaned = firstLine
    .replace(/\/[a-z][\w/-]+\.\w+(:\d+)?(:\d+)?/gi, "[internal]")
    .replace(/[A-Z]:\\[\w\\]+\.\w+(:\d+)?(:\d+)?/gi, "[internal]");

  return cleaned.length > 200 ? cleaned.slice(0, 197) + "..." : cleaned;
}
