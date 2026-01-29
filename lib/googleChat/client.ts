import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const postGoogleChatMessage = async (webhookUrl: string, message: string) => {

  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Google Chat webhook failed with status ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    captureExceptionAndLog(error);
  }
};
