import { config } from "./config";

interface CrankerResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function crankerGet<T = unknown>(path: string): Promise<CrankerResponse<T>> {
  // Validate path to prevent SSRF / path traversal
  if (!path.startsWith("/") || path.includes("..")) {
    throw new Error(`Invalid cranker path: ${path}`);
  }
  const url = `${config.crankerUrl}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(config.crankerApiKey ? { Authorization: `Bearer ${config.crankerApiKey}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}
