import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cacheFor } from "@/lib/cache";

const SECRET_CACHE_KEY = "vault-secret";
const SECRET_CACHE_DURATION = 300; // 5 minutes

interface VaultSecret {
  id: string;
  name: string;
  decrypted_secret: string;
  created_at: string;
  updated_at: string;
}

const cache = cacheFor<string>(SECRET_CACHE_KEY);

export async function getOrCreateSecret(secretName: string): Promise<string> {
  const cachedSecret = await cache.get();
  if (cachedSecret) {
    return cachedSecret;
  }

  try {
    // Check if secret exists in vault
    const existingSecret = await db.execute(
      sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${secretName}`,
    );

    if (existingSecret.rows.length > 0) {
      const secret = existingSecret.rows[0] as unknown as VaultSecret;
      await cache.set(secret.decrypted_secret, SECRET_CACHE_DURATION);
      return secret.decrypted_secret;
    }

    // Generate new secret if it doesn't exist
    const newSecret = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

    // Create secret in vault
    await db.execute(sql`SELECT vault.create_secret(${newSecret}, ${secretName}, ${`Auto-generated ${secretName}`})`);

    // Cache the new secret
    await cache.set(newSecret, SECRET_CACHE_DURATION);

    return newSecret;
  } catch (error) {
    console.error(`Failed to get/create secret ${secretName}:`, error);

    // Fallback to generating a temporary secret (not ideal but prevents crashes)
    const fallbackSecret = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    console.warn(`Using fallback secret for ${secretName} - this should be temporary`);

    return fallbackSecret;
  }
}

export async function getSecret(secretName: string): Promise<string | null> {
  try {
    const cachedSecret = await cache.get();
    if (cachedSecret) {
      return cachedSecret;
    }

    const result = await db.execute(
      sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${secretName}`,
    );

    if (result.rows.length > 0) {
      const secret = result.rows[0] as unknown as VaultSecret;
      await cache.set(secret.decrypted_secret, SECRET_CACHE_DURATION);
      return secret.decrypted_secret;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get secret ${secretName}:`, error);
    return null;
  }
}

export async function updateSecret(secretName: string, newValue: string): Promise<void> {
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

    // Update cache
    await cache.set(newValue, SECRET_CACHE_DURATION);
  } catch (error) {
    console.error(`Failed to update secret ${secretName}:`, error);
    throw error;
  }
}

export async function clearSecretCache(): Promise<void> {
  await cache.set("", 1); // Set to expire immediately
}
