"use server";

import crypto from "node:crypto";

export type HelperAuthParams = {
  email: string;
  hmacSecret?: string;
  mailboxSlug?: string;
};

export class HelperAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelperAuthError";
  }
}

/**
 * Validates email format using a regular expression
 * @param email Email address to validate
 * @returns true if email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates authentication parameters required for Helper widget
 * @param params Object containing email and optional HMAC secret
 * @returns Object with email, timestamp, and HMAC hash
 * @throws HelperAuthError if HMAC secret is not provided or if input validation fails
 */
export function generateHelperAuth({ email, hmacSecret, mailboxSlug }: HelperAuthParams) {
  if (!email) {
    throw new HelperAuthError("Email is required");
  }

  if (!isValidEmail(email)) {
    throw new HelperAuthError("Invalid email format");
  }

  const finalHmacSecret = hmacSecret || process.env.HELPER_HMAC_SECRET;
  if (!finalHmacSecret) {
    throw new HelperAuthError("HMAC secret must be provided via parameter or HELPER_HMAC_SECRET environment variable");
  }

  const timestamp = Date.now();

  const hmac = crypto.createHmac("sha256", finalHmacSecret).update(`${email}:${timestamp}`).digest("hex");

  const finalMailboxSlug = mailboxSlug || process.env.HELPER_MAILBOX_SLUG;
  if (!finalMailboxSlug) {
    throw new HelperAuthError(
      "Mailbox slug must be provided via parameter or HELPER_MAILBOX_SLUG environment variable",
    );
  }

  return {
    email,
    timestamp,
    emailHash: hmac,
    mailboxSlug: finalMailboxSlug,
  };
}
