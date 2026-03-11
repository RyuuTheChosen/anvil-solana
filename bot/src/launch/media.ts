import { log, warn } from "../logger";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const DOWNLOAD_TIMEOUT_MS = 10_000;

// SSRF prevention: only allow Twitter media domains
const ALLOWED_IMAGE_HOSTS = new Set(["pbs.twimg.com", "video.twimg.com"]);

function isAllowedImageUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") return false;
    if (!ALLOWED_IMAGE_HOSTS.has(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Validate magic bytes for JPEG, PNG, GIF, WebP */
function isValidImageMagic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: RIFF....WEBP (bytes 8-11)
  if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

/**
 * Download a tweet image. Returns Buffer in memory (never written to disk).
 * Validates: SSRF prevention, content-type, size, magic bytes.
 */
export async function downloadTweetImage(url: string): Promise<Buffer | null> {
  if (!isAllowedImageUrl(url)) {
    warn("media", "Rejected image URL (SSRF check)", { url });
    return null;
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!res.ok) {
      warn("media", "Image download failed", { url, status: res.status });
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      warn("media", "Invalid content-type", { url, contentType });
      return null;
    }

    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_IMAGE_SIZE) {
      warn("media", "Image too large", { url, size: contentLength });
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_IMAGE_SIZE) {
      warn("media", "Image buffer too large", { url, size: buffer.length });
      return null;
    }

    if (!isValidImageMagic(buffer)) {
      warn("media", "Invalid image magic bytes", { url });
      return null;
    }

    log("media", "Downloaded image", { url, size: buffer.length });
    return buffer;
  } catch (err) {
    warn("media", "Image download error", { url, error: String(err) });
    return null;
  }
}
