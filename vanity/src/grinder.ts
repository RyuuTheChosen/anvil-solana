import { spawn } from "child_process";
import { mkdtempSync, readdirSync, readFileSync, unlinkSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Keypair } from "@solana/web3.js";

export async function grindKeypairs(suffix: string, count: number): Promise<Keypair[]> {
  const tempDir = mkdtempSync(join(tmpdir(), "vanity-grind-"));

  console.log(`[grinder] Starting solana-keygen grind --ends-with ${suffix}:${count}`);
  const startTime = Date.now();

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("solana-keygen", [
      "grind",
      "--ends-with", `${suffix}:${count}`,
    ], { cwd: tempDir });

    let stderrBuf = "";

    proc.stdout.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) console.log(`[grinder] ${line}`);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderrBuf += data.toString();
      // Log progress lines from solana-keygen
      const lines = stderrBuf.split("\n");
      stderrBuf = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) console.log(`[grinder] ${line.trim()}`);
      }
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`solana-keygen exited with code ${code}`));
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn solana-keygen: ${err.message}`));
    });
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[grinder] Grind completed in ${elapsed}s`);

  // Parse output files
  const files = readdirSync(tempDir).filter(f => f.endsWith(".json"));
  const keypairs: Keypair[] = [];

  for (const file of files) {
    const filePath = join(tempDir, file);
    try {
      const arr: number[] = JSON.parse(readFileSync(filePath, "utf8"));
      if (!Array.isArray(arr) || arr.length !== 64) {
        console.warn(`[grinder] Skipping malformed file: ${file}`);
        continue;
      }

      const kp = Keypair.fromSecretKey(Uint8Array.from(arr));

      if (!kp.publicKey.toBase58().endsWith(suffix)) {
        console.warn(`[grinder] Skipping non-matching key: ${kp.publicKey.toBase58()}`);
        continue;
      }

      keypairs.push(kp);
    } catch (err) {
      console.warn(`[grinder] Failed to parse ${file}:`, err);
    } finally {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  // Clean up temp directory
  try { rmdirSync(tempDir); } catch { /* may not be empty */ }

  return keypairs;
}

export async function verifyCliInstalled(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("solana-keygen", ["--version"]);
    let output = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`[grinder] ${output.trim()}`);
        resolve();
      } else {
        reject(new Error("solana-keygen not found. Install Solana CLI: https://docs.solanalabs.com/cli/install"));
      }
    });

    proc.on("error", () => {
      reject(new Error("solana-keygen not found. Install Solana CLI: https://docs.solanalabs.com/cli/install"));
    });
  });
}
