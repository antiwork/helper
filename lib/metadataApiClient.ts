import crypto from "crypto";
import { URLSearchParams } from "url";
import { z } from "zod";
import { Mailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const METADATA_API_TIMEOUT_SECONDS = 15;
const METADATA_API_MAX_LENGTH = 5000; // ~1000 tokens (GPT-3.5/GPT-4)

export class MetadataAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.stack = undefined;
  }
}

/**
 * Helper to get the current timestamp in seconds
 * @returns The current timestamp in seconds
 */
export const timestamp = () => Math.floor(Date.now() / 1000);

export async function getMetadata(endpoint: { url: string; hmacSecret: string }, queryParams: Record<string, any>) {
  const { url, hmacSecret } = endpoint;
  const hmacSignature = createHmacSignature(hmacSecret, { query: queryParams });

  try {
    const response = await fetch(`${url}?${new URLSearchParams(queryParams)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hmacSignature}`,
      },
      signal: AbortSignal.timeout(METADATA_API_TIMEOUT_SECONDS * 1000),
    });

    if (!response.ok) {
      throw new MetadataAPIError(`HTTP error occurred: ${response.status}`);
    }

    return validateResponse(await response.json());
  } catch (error) {
    if (error instanceof MetadataAPIError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new MetadataAPIError(`Request exceeded maximum timeout of ${METADATA_API_TIMEOUT_SECONDS} seconds`);
    }
    if (error instanceof Error && error.message.includes("is not valid JSON")) {
      throw new MetadataAPIError("Endpoint did not return JSON response");
    }
    captureExceptionAndLog(error);
    throw new MetadataAPIError("Unexpected server error");
  }
}

export function createHmacDigest(
  hmacSecret: string,
  params: { query: Record<string, any> } | { json: Record<string, any> },
): Buffer {
  const serializedParams =
    "json" in params ? JSON.stringify(params.json) : new URLSearchParams(params.query || {}).toString();
  return crypto.createHmac("sha256", hmacSecret).update(serializedParams).digest();
}

function createHmacSignature(
  hmacSecret: string,
  params: { query: Record<string, any> } | { json: Record<string, any> },
): string {
  const hmacDigest = createHmacDigest(hmacSecret, params);
  return hmacDigest.toString("base64");
}

const responseSchema = z.object({
  success: z.literal(true),
  customer: z
    .object({
      name: z.string().nullish(),
      value: z.number().nullish(),
      metadata: z.record(z.string(), z.any()).nullish(),
      actions: z.record(z.string(), z.string()).nullish(),
    })
    .optional(),
  // Deprecated
  user_info: z
    .object({
      prompt: z.string(),
      metadata: z.object({
        name: z.string().optional().nullable(),
        value: z.number().optional().nullable(),
        links: z.record(z.string(), z.string()).optional().nullable(),
      }),
    })
    .refine((data) => {
      const { prompt, metadata } = data;
      return prompt.length <= METADATA_API_MAX_LENGTH && JSON.stringify(metadata).length <= METADATA_API_MAX_LENGTH;
    }, `Exceeded maximum length of ${METADATA_API_MAX_LENGTH} characters`)
    .optional(),
});
export type CustomerInfo = NonNullable<z.infer<typeof responseSchema>["customer"]>;

function validateResponse(data: any) {
  const parsedData = responseSchema.safeParse(data);

  if (!parsedData.success) {
    const messages = parsedData.error.issues.map((issue) => `'${issue.path.join(".")}' ${issue.message}`).join("; ");
    throw new MetadataAPIError(`Invalid format for JSON response: ${messages}`);
  }

  return parsedData.data;
}

export const fetchCustomerInfo = async (email: string, customerInfoUrl: string, mailbox: Mailbox) => {
  try {
    const metadata = await getMetadata(
      { url: customerInfoUrl, hmacSecret: mailbox.widgetHMACSecret },
      { email, timestamp: Math.floor(Date.now() / 1000) },
    );
    return metadata?.customer ?? null;
  } catch (error) {
    captureExceptionAndLog(error);
    return null;
  }
};
