import crypto from "crypto";
import { CustomerInfo } from "@helperai/client";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const KEY_LENGTH = 32; // AES-256 key length

/**
 * Derives a consistent 32-byte encryption key from the HMAC secret using PBKDF2
 * This ensures we always get a proper AES-256 key regardless of the HMAC secret length
 */
function deriveEncryptionKey(hmacSecret: string): Buffer {
  // Use a fixed salt for consistency - in production you might want to use the mailbox ID as salt
  const salt = Buffer.from("helper-widget-encryption", "utf8");
  return crypto.pbkdf2Sync(hmacSecret, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypts customer data for secure transmission to frontend
 * Uses AES-256-GCM which provides both encryption and authentication
 *
 * @param data - The customer data to encrypt (will be JSON stringified)
 * @param hmacSecret - The HMAC secret to derive the encryption key from
 * @returns Encrypted string in format: iv:tag:encrypted_data (all base64 encoded)
 */
export function encryptCustomerData(data: CustomerInfo, hmacSecret: string): string {
  const key = deriveEncryptionKey(hmacSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const dataString = JSON.stringify(data);
  let encrypted = cipher.update(dataString, "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag();

  // Return format: iv:tag:encrypted_data (all base64 encoded)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypts customer data that was encrypted with encryptCustomerData
 *
 * @param encryptedData - The encrypted string from encryptCustomerData
 * @param hmacSecret - The HMAC secret used for encryption
 * @returns The decrypted and parsed customer data
 * @throws Error if decryption fails (invalid format, wrong key, or tampered data)
 */
export function decryptCustomerData(encryptedData: string, hmacSecret: string): CustomerInfo {
  try {
    const key = deriveEncryptionKey(hmacSecret);
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0]!, "base64");
    const tag = Buffer.from(parts[1]!, "base64");
    const encrypted = parts[2]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Failed to decrypt customer data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isEncryptedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
