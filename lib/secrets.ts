import crypto from "crypto";
import { sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";

export const SECRET_NAMES = {
  JOBS_HMAC: "jobs-hmac-secret",
  HASH_WORDS: "hash-words-secret",
} as const;

export type SecretName = (typeof SECRET_NAMES)[keyof typeof SECRET_NAMES];

interface VaultSecret {
  id: string;
  name: string;
  decrypted_secret: string;
  created_at: string;
  updated_at: string;
}

export const getOrCreateSecret = cache(async (secretName: SecretName): Promise<string> => {
  try {
    // Check if secret exists in vault
    const existingSecret = await db.execute(
      sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${secretName}`,
    );

    if (existingSecret.rows.length > 0) {
      const secret = existingSecret.rows[0] as unknown as VaultSecret;
      return secret.decrypted_secret;
    }

    // Generate new secret if it doesn't exist
    const newSecret = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

    // Create secret in vault
    await db.execute(sql`SELECT vault.create_secret(${newSecret}, ${secretName}, ${`Auto-generated ${secretName}`})`);

    return newSecret;
  } catch (error) {
    throw error;
  }
});

export const getSecret = cache(async (secretName: SecretName): Promise<string | null> => {
  try {
    const result = await db.execute(
      sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${secretName}`,
    );

    if (result.rows.length > 0) {
      const secret = result.rows[0] as unknown as VaultSecret;
      return secret.decrypted_secret;
    }

    return null;
  } catch {
    return null;
  }
});

export async function updateSecret(secretName: SecretName, newValue: string): Promise<void> {
  try {
    // Get the secret ID first
    const secretResult = await db.execute(sql`SELECT id FROM vault.secrets WHERE name = ${secretName}`);

    if (secretResult.rows.length > 0) {
      const secretId = secretResult.rows[0]?.id;
      if (!secretId) {
        throw new Error("Secret ID not found");
      }

      // Update the secret
      await db.execute(
        sql`SELECT vault.update_secret(${secretId}, ${newValue}, ${secretName}, ${`Updated ${secretName}`})`,
      );
    } else {
      // Create new secret if it doesn't exist
      await db.execute(sql`SELECT vault.create_secret(${newValue}, ${secretName}, ${`Created ${secretName}`})`);
    }
  } catch (error) {
    throw error;
  }
}
