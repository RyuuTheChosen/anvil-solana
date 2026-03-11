import fs from "fs";
import path from "path";
import { prisma } from "../db/client";

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const FILE_MAX_AGE_MS = 60 * 60 * 1000;         // 1 hour
const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;  // 24 hours
const FILE_CLEANUP_INTERVAL = 30 * 60 * 1000;    // 30 min
const ORPHAN_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

function cleanUploads(): void {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;
    const files = fs.readdirSync(UPLOADS_DIR);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      try {
        const filePath = path.join(UPLOADS_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > FILE_MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {
        // Skip files that can't be stat'd or deleted
      }
    }

    if (cleaned > 0) {
      console.log(`[cleanup] Removed ${cleaned} stale upload(s)`);
    }
  } catch (err) {
    console.error("[cleanup] Failed to clean uploads:", err);
  }
}

async function cleanOrphanVaults(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - ORPHAN_MAX_AGE_MS);
    const result = await prisma.vault.deleteMany({
      where: {
        vaultCreated: false,
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      console.log(`[cleanup] Removed ${result.count} orphan vault(s)`);
    }
  } catch (err) {
    console.error("[cleanup] Failed to clean orphan vaults:", err);
  }
}

export function startCleanupJobs(): void {
  setInterval(cleanUploads, FILE_CLEANUP_INTERVAL);
  setInterval(() => { cleanOrphanVaults(); }, ORPHAN_CLEANUP_INTERVAL);
  // Run uploads cleanup once on startup after 1 minute delay
  setTimeout(cleanUploads, 60_000);
}
