import FormData from "form-data";
import { config } from "../config";
import { log, warn, error as logError } from "../logger";

const TIMEOUT_MS = 30_000;

interface BackendResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.botApiKey}`,
    "X-Requested-With": "AnvilProtocol",
    "Content-Type": "application/json",
  };
}

async function backendFetch<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  customHeaders?: Record<string, string>,
): Promise<BackendResponse<T>> {
  const url = `${config.backendUrl}${path}`;
  const headers = customHeaders || authHeaders();

  const res = await fetch(url, {
    method,
    headers,
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await res.json() as T;

  if (!res.ok) {
    const errMsg = (data as any)?.error || (data as any)?.message || JSON.stringify(data);
    logError("backend", `${method} ${path} failed: ${errMsg}`, { status: res.status });
  } else {
    log("backend", `${method} ${path}`, { status: res.status });
  }

  // Security warning on auth failures
  if (res.status === 401 || res.status === 403) {
    warn("backend", `Auth failure on ${path} — BOT_API_KEY may be invalid`, { status: res.status });
  }

  return { ok: res.ok, status: res.status, data };
}

// ─── Wallet APIs ────────────────────────────────────────────────────────────

export async function createWallet(xUserId: string, xUsername: string) {
  return backendFetch<{ success: boolean; publicKey?: string; existing?: boolean }>(
    "POST", "/api/wallet/create", { xUserId, xUsername },
  );
}

export async function getWallet(xUserId: string) {
  return backendFetch<{ success: boolean; publicKey?: string; xUsername?: string }>(
    "GET", `/api/wallet/${xUserId}`,
  );
}

export async function getBalance(xUserId: string) {
  return backendFetch<{ success: boolean; balanceLamports?: number; balanceSol?: number }>(
    "GET", `/api/wallet/${xUserId}/balance`,
  );
}

export async function checkRateLimit(xUserId: string) {
  return backendFetch<{ allowed: boolean; remaining?: number }>(
    "POST", "/api/wallet/check-rate-limit", { xUserId },
  );
}

export async function signAndSubmit(xUserId: string, opts: { serializedTx?: string; instructionSet?: unknown }) {
  return backendFetch<{ success: boolean; signature?: string }>(
    "POST", "/api/wallet/sign-and-submit", { xUserId, ...opts },
  );
}

// ─── Launch APIs ────────────────────────────────────────────────────────────

export async function uploadMetadata(
  imageBuffer: Buffer,
  fields: { name: string; symbol: string; description: string },
) {
  const form = new FormData();
  form.append("image", imageBuffer, { filename: "token.png", contentType: "image/png" });
  form.append("name", fields.name);
  form.append("symbol", fields.symbol);
  form.append("description", fields.description);

  const url = `${config.backendUrl}/api/launch/preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.botApiKey}`,
      "X-Requested-With": "AnvilProtocol",
      ...form.getHeaders(),
    },
    body: form.getBuffer() as unknown as BodyInit,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await res.json() as { success: boolean; metadataUri?: string; imageUri?: string; error?: string };
  if (!res.ok) {
    logError("backend", `POST /api/launch/preview failed: ${data.error || JSON.stringify(data)}`, { status: res.status });
  } else {
    log("backend", "POST /api/launch/preview", { status: res.status });
  }
  return { ok: res.ok, status: res.status, data };
}

export async function buildTx(params: {
  creator: string;
  name: string;
  symbol: string;
  metadataUri: string;
  devBuySol: number;
  maxHolders: number;
  holderSplitBps: number;
}) {
  return backendFetch<{
    success: boolean;
    isVanity?: boolean;
    poolEmpty?: boolean;
    mint?: string;
    feeAccount?: string;
    partiallySignedTx?: string;
    instructionSet?: unknown;
  }>("POST", "/api/launch/build-tx", params);
}

export async function confirmTx(
  mint: string,
  signature: string,
  meta?: { creator: string; name: string; symbol: string; metadataUri: string; imageUrl?: string },
) {
  return backendFetch<{ success: boolean; mint?: string; creator?: string }>(
    "POST", "/api/launch/confirm", { mint, signature, ...meta },
  );
}

export async function buildConfigure(mint: string, creator: string) {
  return backendFetch<{
    success: boolean;
    alreadyConfigured?: boolean;
    instructionSet?: { instructions: unknown[]; mintMustSign: boolean };
    mint?: string;
  }>("POST", "/api/launch/build-configure", { mint, creator });
}

export async function confirmConfigure(mint: string, signature: string) {
  return backendFetch<{
    success: boolean;
    mint?: string;
    feeSharingConfirmed?: boolean;
    vaultCreated?: boolean;
  }>("POST", "/api/launch/confirm-configure", { mint, signature });
}
