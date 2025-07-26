import { and, count, eq, exists, gt, isNull, or } from "drizzle-orm";
import { corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { UnreadConversationsCountResult } from "@/packages/client";

export const GET = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  let customerFilter;
  if (session.isAnonymous && session.anonymousSessionId) {
    customerFilter = eq(conversations.anonymousSessionId, session.anonymousSessionId);
  } else if (session.email) {
    customerFilter = eq(conversations.customer, session.email);
  } else {
    return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });
  }

  const unreadCount = await db
    .select({ count: count() })
    .from(conversations)
    .where(
      and(
        eq(conversations.mailboxId, mailbox.id),
        customerFilter,
        exists(
          db
            .select()
            .from(conversationMessages)
            .where(
              and(
                eq(conversationMessages.conversationId, conversations.id),
                or(isNull(conversations.lastReadAt), gt(conversationMessages.createdAt, conversations.lastReadAt)),
              ),
            ),
        ),
      ),
    );

  return corsResponse<UnreadConversationsCountResult>({
    count: unreadCount[0]?.count ?? 0,
  });
});
