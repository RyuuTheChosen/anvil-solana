import crypto from "crypto";
import { config } from "../config/env";

// Vanity keypair encryption constants (existing — do not change)
const VANITY_HKDF_INFO = Buffer.from("anvil-vanity-keypair-encryption-v1");
const VANITY_HKDF_SALT = Buffer.alloc(32, 0); // Legacy zero-salt, kept for backward compat

// Custodial wallet encryption constants (separate derivation path)
const CUSTODIAL_HKDF_INFO = Buffer.from("anvil-custodial-wallet-encryption-v1");
const CUSTODIAL_HKDF_SALT = Buffer.from("anvil-custodial-salt-v1");

const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12;  // GCM spec: 96-bit IV
const AUTH_TAG_LENGTH = 16;

// Cache derived keys by info string (one per encryption domain)
const _derivedKeys = new Map<string, Buffer>();

function getDerivedKey(masterKey: string, info: Buffer, salt: Buffer): Buffer {
  const cacheKey = info.toString();
  const cached = _derivedKeys.get(cacheKey);
  if (cached) return cached;

  const key = Buffer.from(crypto.hkdfSync(
    "sha256",
    Buffer.from(masterKey),
    salt,
    info,
    KEY_LENGTH,
  ));
  _derivedKeys.set(cacheKey, key);
  return key;
}

/**
 * Encrypt a secret key using AES-256-GCM.
 * Returns format: "iv:authTag:ciphertext" (base64-encoded parts).
 */
export function encryptSecretKey(
  secretKey: Uint8Array,
  masterKey: string,
  info: Buffer = CUSTODIAL_HKDF_INFO,
  salt: Buffer = CUSTODIAL_HKDF_SALT,
): string {
  const key = getDerivedKey(masterKey, info, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secretKey), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a secret key from "iv:authTag:ciphertext" format.
 * Zeros the intermediate Buffer after copying to Uint8Array.
 */
export function decryptSecretKey(
  encrypted: string,
  masterKey?: string,
  info?: Buffer,
  salt?: Buffer,
): Uint8Array {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Decryption failed");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Decryption failed");
  }

  // Default to vanity keypair decryption for backward compat
  const key = getDerivedKey(
    masterKey || config.vaultMasterKey,
    info || VANITY_HKDF_INFO,
    salt || VANITY_HKDF_SALT,
  );

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    const result = new Uint8Array(decrypted);
    decrypted.fill(0); // Zero intermediate Buffer immediately
    return result;
  } catch {
    throw new Error("Decryption failed");
  }
}

// Re-export constants for custodial wallet module
export { CUSTODIAL_HKDF_INFO, CUSTODIAL_HKDF_SALT };
