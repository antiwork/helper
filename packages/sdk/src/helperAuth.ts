"use server";

export type HelperAuthParams = {
  email: string;
  hmacSecret: string;
  dangerouslyAllowInBrowser?: boolean;
};

export class HelperAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelperAuthError";
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates authentication parameters required for Helper widget
 * @param params Object containing email and optional HMAC secret
 * @returns Object with email, timestamp, and HMAC hash
 * @throws HelperAuthError if HMAC secret is not provided or if input validation fails
 */
export async function generateHelperAuth({ email, hmacSecret, dangerouslyAllowInBrowser }: HelperAuthParams) {
  if (!dangerouslyAllowInBrowser && typeof window !== "undefined") {
    throw new HelperAuthError(
      "generateHelperAuth must be called on the server. If you have a `window` object on the server you can bypass this check with `dangerouslyAllowInBrowser: true`.",
    );
  }

  if (!email) {
    throw new HelperAuthError("Email is required");
  }

  if (!isValidEmail(email)) {
    throw new HelperAuthError("Invalid email format");
  }

  const timestamp = Date.now();

  const encoder = new TextEncoder();
  const keyData = encoder.encode(hmacSecret);
  const messageData = encoder.encode(`${email}:${timestamp}`);

  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hmac = bufferToHex(signature);

  return {
    email,
    timestamp,
    emailHash: hmac,
  };
}
