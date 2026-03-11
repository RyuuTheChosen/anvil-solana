const PUMP_API = "https://frontend-api-v3.pump.fun/coins";

export interface PumpCoinMetadata {
  name: string;
  symbol: string;
  metadataUri: string | null;
  imageUrl: string | null;
  bondingCurve: string | null;
}

/**
 * Fetch token metadata from PumpFun's public API.
 * Returns null if the token is not found or the request fails.
 */
export async function fetchPumpMetadata(mint: string): Promise<PumpCoinMetadata | null> {
  try {
    const res = await fetch(`${PUMP_API}/${mint}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      name?: string;
      symbol?: string;
      metadata_uri?: string;
      image_uri?: string;
      bonding_curve?: string;
    };

    if (!data.name) return null;

    const imageUrl = data.image_uri && /^https:\/\//.test(data.image_uri)
      ? data.image_uri.slice(0, 512)
      : null;

    return {
      name: data.name.slice(0, 32),
      symbol: data.symbol?.slice(0, 10) || "???",
      metadataUri: data.metadata_uri?.slice(0, 512) || null,
      imageUrl,
      bondingCurve: data.bonding_curve || null,
    };
  } catch {
    return null;
  }
}
