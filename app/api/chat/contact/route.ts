import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createApiHandler } from "@/app/api/route-handler";
import { corsOptions, corsResponse } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { triggerEvent } from "@/jobs/trigger";
import { createConversation, generateConversationSubject } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";

const requestSchema = z.object({
  email: z.string().email(),
  message: z.string().min(1),
});

export function OPTIONS() {
  return corsOptions();
}

export const POST = createApiHandler(
  async (
    request: Request,
    context: { params?: Record<string, string>; mailbox: any; session: any },
    validatedBody: z.infer<typeof requestSchema>,
  ) => {
    const { email, message } = validatedBody;
    const { mailbox } = context;

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

    waitUntil(triggerEvent("conversations/auto-response.create", { messageId: result.userMessage.id }));

    return corsResponse({ success: true, conversationSlug: result.newConversation.slug });
  },
  {
    requiresAuth: true,
    requestSchema,
  },
);
