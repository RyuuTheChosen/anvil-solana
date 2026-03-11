import { config } from "../config/env";

const CRANKER_URL = config.crankerUrl;
const CRANKER_API_KEY = process.env.CRANKER_API_KEY || "";

interface CrankerResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function crankerGet<T = unknown>(path: string): Promise<CrankerResponse<T>> {
  const url = `${CRANKER_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(CRANKER_API_KEY ? { Authorization: `Bearer ${CRANKER_API_KEY}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  const data = await res.json() as T;
  return { ok: res.ok, status: res.status, data };
}

export async function crankerPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<CrankerResponse<T>> {
  const url = `${CRANKER_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(CRANKER_API_KEY ? { Authorization: `Bearer ${CRANKER_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  const data = await res.json() as T;
  return { ok: res.ok, status: res.status, data };
}

export interface VaultMetadata {
  name?: string;
  symbol?: string;
  metadataUri?: string;
  imageUrl?: string;
  maxHolders?: number;
  holderSplitBps?: number;
  claimExpiryHours?: number;
  distributionMode?: string;
}

/**
 * Register a vault with the cranker. Retries up to 3 times on failure.
 */
export async function registerVaultWithCranker(
  tokenMint: string,
  creator: string,
  metadata?: VaultMetadata
): Promise<{ success: boolean; error?: string }> {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await crankerPost<{ success?: boolean; error?: string }>(
        "/api/vaults/register",
        { tokenMint, creator, ...metadata }
      );

      if (res.ok) {
        return { success: true };
      }

      console.error(
        `[crankerClient] Registration attempt ${attempt}/${MAX_RETRIES} failed:`,
        res.status,
        res.data
      );
    } catch (err) {
      console.error(
        `[crankerClient] Registration attempt ${attempt}/${MAX_RETRIES} error:`,
        err
      );
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return { success: false, error: "Failed to register vault with cranker after retries" };
}
