import { corsOptions, corsResponse, withAuth } from "@/app/api/widget/utils";
import { CHAT_CONVERSATION_SUBJECT, createConversation } from "@/lib/data/conversation";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

const VIP_INITIAL_STATUS = "open";
const DEFAULT_INITIAL_STATUS = "closed";

export function OPTIONS() {
  return corsOptions();
}

export const POST = withAuth(async ({ request }, { session, mailbox }) => {
  const { isPrompt } = await request.json();
  const isVisitor = session.isAnonymous;
  let status = DEFAULT_INITIAL_STATUS;

  if (isVisitor && session.email) {
    const platformCustomer = await getPlatformCustomer(mailbox.id, session.email);
    if (platformCustomer?.isVip && !isPrompt) {
      status = VIP_INITIAL_STATUS;
    }
  }

  const newConversation = await createConversation({
    emailFrom: isVisitor || !session.email ? null : session.email,
    mailboxId: mailbox.id,
    subject: CHAT_CONVERSATION_SUBJECT,
    closedAt: status === DEFAULT_INITIAL_STATUS ? new Date() : undefined,
    status: status as "open" | "closed",
    source: "chat",
    isPrompt,
    isVisitor,
    assignedToAI: true,
    anonymousSessionId: session.isAnonymous ? session.anonymousSessionId : undefined,
  });

  return corsResponse({ conversationSlug: newConversation.slug });
});
