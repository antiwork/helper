import { waitUntil } from "@vercel/functions";
import { authenticateWidget, corsOptions, corsResponse } from "@/app/api/widget/utils";
import { inngest } from "@/inngest/client";
import { createConversation } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { db } from "@/db/client";

export const maxDuration = 60;

interface ContactRequestBody {
  email: string;
  message: string;
  token: string;
}

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const { email, message }: ContactRequestBody = await request.json();

  if (!email || !message) {
    return corsResponse({ error: "Email and message are required" }, { status: 400 });
  }

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { mailbox } = authResult;

  try {
    const result = await db.transaction(async (tx) => {
      const newConversation = await createConversation({
        emailFrom: email,
        mailboxId: mailbox.id,
        subject: "Contact Form Submission",
        status: "open",
        source: "form",
        assignedToAI: true,
        isPrompt: false,
        isVisitor: false,
      }, tx);

      const userMessage = await createConversationMessage({
        conversationId: newConversation.id,
        emailFrom: email,
        body: message,
        role: "user",
        status: "sent",
        isPerfect: false,
        isFlaggedAsBad: false,
      }, tx);

      return { newConversation, userMessage };
    });

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
