import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { triggerEvent } from "@/jobs/trigger";
import { createConversation, generateConversationSubject } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const requestSchema = z.object({
  email: z.string().email(),
  message: z.string().min(1),
});

export const OPTIONS = () => corsOptions("POST");

export const POST = withWidgetAuth(async ({ request }, { mailbox }) => {
  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return corsResponse({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { email, message } = result.data;

  try {
    const result = await db.transaction(async (tx) => {
      const newConversation = await createConversation(
        {
          emailFrom: email,
          subject: "Contact Form Submission",
          status: "open",
          source: "form",
          assignedToAI: true,
          isPrompt: false,
          isVisitor: false,
        },
        tx,
      );

      const userMessage = await createConversationMessage(
        {
          conversationId: newConversation.id,
          emailFrom: email,
          body: message,
          role: "user",
          status: "sent",
          isPerfect: false,
          isFlaggedAsBad: false,
        },
        tx,
      );

      return { newConversation, userMessage };
    });

    waitUntil(
      generateConversationSubject(result.newConversation.id, [{ role: "user", content: message, id: "temp" }], mailbox),
    );

    waitUntil(triggerEvent("conversations/auto-response.create", { messageId: result.userMessage.id }));

    return corsResponse({ success: true, conversationSlug: result.newConversation.slug });
  } catch (error) {
    captureExceptionAndLog(error);
    return corsResponse({ error: "Failed to send message" }, { status: 500 });
  }
});
