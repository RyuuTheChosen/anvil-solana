import crypto from "crypto";
import { config } from "./config";

const HKDF_INFO = Buffer.from("anvil-vanity-keypair-encryption-v1");
const HKDF_SALT = Buffer.alloc(32, 0);
const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12;  // GCM spec: 96-bit IV
const AUTH_TAG_LENGTH = 16;

let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_derivedKey) return _derivedKey;
  _derivedKey = Buffer.from(crypto.hkdfSync(
    "sha256",
    Buffer.from(config.vaultMasterKey),
    HKDF_SALT,
    HKDF_INFO,
    KEY_LENGTH,
  ));
  return _derivedKey;
}

export function encryptSecretKey(secretKey: Uint8Array): string {
  if (secretKey.length !== 64) {
    throw new Error("Secret key must be exactly 64 bytes");
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecretKey(encrypted: string): Uint8Array {
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

  const key = getDerivedKey();

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return new Uint8Array(decrypted);
  } catch {
    throw new Error("Decryption failed");
  }
}
