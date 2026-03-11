import { apiFetch } from "./api";

interface AdminAuth {
  wallet: string;
  signature: string; // base64
  timestamp: number;
}

let cachedAuth: AdminAuth | null = null;
let signingPromise: Promise<AdminAuth> | null = null;

const MAX_AGE_MS = 4 * 60 * 1000; // re-sign after 4 min (server allows 5)

/**
 * Sign an admin authentication message with the connected wallet.
 * Caches the signature and reuses it within the validity window.
 * Concurrent calls share the same signing promise (one wallet popup).
 */
async function getAdminAuth(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  publicKey: { toBase58(): string }
): Promise<AdminAuth> {
  const wallet = publicKey.toBase58();

  // Return cached auth if still valid and same wallet
  if (cachedAuth && cachedAuth.wallet === wallet && Date.now() - cachedAuth.timestamp < MAX_AGE_MS) {
    return cachedAuth;
  }

  // If a signing request is already in progress, wait for it
  if (signingPromise) {
    return signingPromise;
  }

  signingPromise = (async () => {
    const timestamp = Date.now();
    const message = `anvil-admin:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = await signMessage(messageBytes);

    // Encode signature as base64 (matches backend convention in vault.ts)
    const signature = Buffer.from(sigBytes).toString("base64");

    const auth: AdminAuth = { wallet, signature, timestamp };
    cachedAuth = auth;
    return auth;
  })();

  try {
    return await signingPromise;
  } finally {
    signingPromise = null;
  }
}

/**
 * Create an admin-authenticated fetch function bound to a wallet.
 *
 * Usage:
 *   const adminFetch = createAdminFetcher(signMessage, publicKey);
 *   const res = await adminFetch("/api/explore/vault-health");
 */
export function createAdminFetcher(
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined,
  publicKey: { toBase58(): string } | null
) {
  return async function adminFetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!signMessage || !publicKey) {
      throw new Error("Wallet not connected or does not support message signing");
    }

    const auth = await getAdminAuth(signMessage, publicKey);

    const headers = new Headers(options.headers);
    headers.set("x-admin-wallet", auth.wallet);
    headers.set("x-admin-signature", auth.signature);
    headers.set("x-admin-timestamp", String(auth.timestamp));

    return apiFetch(path, { ...options, headers });
  };
}

/** Clear cached admin auth (call on wallet disconnect). */
export function clearAdminAuth(): void {
  cachedAuth = null;
  signingPromise = null;
}
