import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authenticateWidget, corsOptions, corsResponse } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { inngest } from "@/inngest/client";
import { createConversation, generateConversationSubject } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const requestSchema = z.object({
  email: z.string().email(),
  message: z.string().min(1),
});

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return corsResponse({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { email, message } = result.data;

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { mailbox } = authResult;

  try {
    const result = await db.transaction(async (tx) => {
      const newConversation = await createConversation(
        {
          emailFrom: email,
          mailboxId: mailbox.id,
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

    waitUntil(
      inngest.send({
        name: "conversations/auto-response.create",
        data: { messageId: result.userMessage.id },
      }),
    );

    return corsResponse({ success: true, conversationSlug: result.newConversation.slug });
  } catch (error) {
    captureExceptionAndLog(error);
    return corsResponse({ error: "Failed to send message" }, { status: 500 });
  }
}
