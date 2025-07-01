import type { NextRequest } from "next/server";
import { z } from "zod";
import { createApiHandler } from "@/app/api/route-handler";
import { corsOptions, corsResponse } from "@/app/api/widget/utils";
import { CHAT_CONVERSATION_SUBJECT, createConversation } from "@/lib/data/conversation";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

const VIP_INITIAL_STATUS = "open";
const DEFAULT_INITIAL_STATUS = "closed";

const requestSchema = z.object({
  isPrompt: z.boolean(),
});

export function OPTIONS() {
  return corsOptions();
}

export const POST = createApiHandler(
  async (
    context: { request: NextRequest; params?: Record<string, string>; mailbox: any; session: any },
    validatedBody: z.infer<typeof requestSchema>,
  ) => {
    const { isPrompt } = validatedBody;
    const { mailbox, session } = context;

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
      anonymousSessionId: isVisitor ? session.anonymousSessionId : undefined,
    });

    return corsResponse({ conversationSlug: newConversation.slug });
  },
  {
    requiresAuth: true,
    requestSchema,
  },
);
