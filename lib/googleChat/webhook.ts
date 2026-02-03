import "server-only";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const DEFAULT_TIMEOUT_MS = 10_000;

export async function postGoogleChatWebhookMessage(
  webhookUrl: string,
  {
    text,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: {
    text: string;
    timeoutMs?: number;
  },
) {
  if (!webhookUrl) throw new Error("Google Chat webhook URL is required");
  if (!text.trim()) throw new Error("Google Chat message text is required");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Google Chat webhook request failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`,
      );
    }
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

