import { waitUntil } from "@vercel/functions";
import { authenticateWidget, corsOptions, corsResponse } from "@/app/api/widget/utils";
import { inngest } from "@/inngest/client";
import { createConversation } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";

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
    const newConversation = await createConversation({
      emailFrom: email,
      mailboxId: mailbox.id,
      subject: "Contact Form Submission",
      status: "open",
      source: "form",
      assignedToAI: true,
      isPrompt: false,
      isVisitor: false,
    });

    const userMessage = await createConversationMessage({
      conversationId: newConversation.id,
      emailFrom: email,
      body: message,
      role: "user",
      status: "sent",
      isPerfect: false,
      isFlaggedAsBad: false,
    });

    waitUntil(
      inngest.send({
        name: "conversations/auto-response.create",
        data: { messageId: userMessage.id },
      }),
    );

    return corsResponse({ success: true, conversationSlug: newConversation.slug });
  } catch (error) {
    console.error("Failed to create contact form conversation:", error);
    return corsResponse({ error: "Failed to send message" }, { status: 500 });
  }
}
