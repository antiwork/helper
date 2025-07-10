import { eq } from "drizzle-orm";
import { createConversationParams, CreateConversationResponse } from "@helperai/sdk";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { CHAT_CONVERSATION_SUBJECT, createConversation } from "@/lib/data/conversation";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

const VIP_INITIAL_STATUS = "open";
const DEFAULT_INITIAL_STATUS = "closed";

export function OPTIONS() {
  return corsOptions();
}

export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const { data: { isPrompt } = {}, error } = createConversationParams.safeParse(await request.json());
  if (error) return corsResponse({ error: error.message }, { status: 400 });

  const isVisitor = session.isAnonymous;
  let status = DEFAULT_INITIAL_STATUS;

  if (isVisitor && session.email) {
    const platformCustomer = await getPlatformCustomer(session.email);
    if (platformCustomer?.isVip && !isPrompt) {
      status = VIP_INITIAL_STATUS;
    }
  }

  const newConversation = await createConversation({
    emailFrom: isVisitor || !session.email ? null : session.email,
    subject: CHAT_CONVERSATION_SUBJECT,
    closedAt: status === DEFAULT_INITIAL_STATUS ? new Date() : undefined,
    status: status as "open" | "closed",
    source: "chat",
    isPrompt,
    isVisitor,
    assignedToAI: true,
    anonymousSessionId: session.isAnonymous ? session.anonymousSessionId : undefined,
  });

  if (!mailbox.chatIntegrationUsed) {
    await db.update(mailboxes).set({ chatIntegrationUsed: true }).where(eq(mailboxes.id, mailbox.id));
  }

  return corsResponse({ conversationSlug: newConversation.slug } satisfies CreateConversationResponse);
});
