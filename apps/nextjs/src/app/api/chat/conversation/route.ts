import { authenticateWidget, corsOptions, corsResponse } from "@/app/api/widget/utils";
import { CHAT_CONVERSATION_SUBJECT, createConversation } from "@/lib/data/conversation";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

const VIP_INITIAL_STATUS = "open";
const DEFAULT_INITIAL_STATUS = "closed";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const isAnonymous = authResult.session.isAnonymous;
  let { source } = await request.json();
  const isPrompt = source === "chat#prompt";
  const isVisitor = isAnonymous && source !== "chat#prompt";
  source = "chat";
  let status = DEFAULT_INITIAL_STATUS;

  if (isAnonymous && authResult.session.email) {
    const platformCustomer = await getPlatformCustomer(authResult.mailbox.id, authResult.session.email);
    if (platformCustomer?.isVip && !isPrompt) {
      status = VIP_INITIAL_STATUS;
    }
  }

  const newConversation = await createConversation({
    emailFrom: isAnonymous || !authResult.session.email ? null : authResult.session.email,
    mailboxId: authResult.mailbox.id,
    subject: CHAT_CONVERSATION_SUBJECT,
    closedAt: status === DEFAULT_INITIAL_STATUS ? new Date() : undefined,
    status: status as "open" | "closed",
    source,
    isPrompt,
    isVisitor,
  });

  return corsResponse({ conversationSlug: newConversation.slug });
}
