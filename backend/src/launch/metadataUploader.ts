import fs from "fs/promises";
import path from "path";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // IPFS URI after upload
  showName?: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
}

/**
 * Upload image + metadata JSON to PumpFun's IPFS via their public endpoint.
 * PumpFun hosts an IPFS upload at https://pump.fun/api/ipfs
 */
export async function uploadMetadata(
  imagePath: string,
  meta: Omit<TokenMetadata, "image">
): Promise<{ metadataUri: string; imageUri: string }> {
  const imageBuffer = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).slice(1) || "png";
  const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  const formData = new FormData();
  formData.append("file", new Blob([imageBuffer], { type: mimeType }), `image.${ext}`);
  formData.append("name", meta.name);
  formData.append("symbol", meta.symbol);
  formData.append("description", meta.description);
  if (meta.twitter) formData.append("twitter", meta.twitter);
  if (meta.telegram) formData.append("telegram", meta.telegram);
  if (meta.website) formData.append("website", meta.website);
  formData.append("showName", String(meta.showName ?? true));

  const response = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IPFS upload failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { metadataUri: string; metadata: { image: string } };

  return {
    metadataUri: data.metadataUri,
    imageUri: data.metadata.image,
  };
}
