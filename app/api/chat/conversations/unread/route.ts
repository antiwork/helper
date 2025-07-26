import { and, count, eq, exists, gt, inArray, isNull, or } from "drizzle-orm";
import { corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { customerSearchSchema } from "@/lib/data/conversation/customerSearchSchema";
import { searchConversations } from "@/lib/data/conversation/search";
import { UnreadConversationsCountResult } from "@/packages/client/src/types";

export const GET = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const url = new URL(request.url);

  let customerFilter;
  if (session.isAnonymous && session.anonymousSessionId) {
    customerFilter = { anonymousSessionId: session.anonymousSessionId };
  } else if (session.email) {
    customerFilter = { customer: [session.email] };
  } else {
    return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });
  }

  const searchParams: Record<string, any> = Object.fromEntries(url.searchParams.entries());

  if (searchParams.status) {
    searchParams.status = searchParams.status.split(",");
  }

  const parsedParams = customerSearchSchema.safeParse({
    ...searchParams,
    limit: searchParams.limit ? parseInt(searchParams.limit) : 1000,
  });

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid search parameters", details: parsedParams.error.issues }, { status: 400 });
  }

  const { list } = await searchConversations(mailbox, { ...parsedParams.data, ...customerFilter });
  const { results } = await list;

  const unreadCount = await db
    .select({ count: count() })
    .from(conversations)
    .where(
      and(
        inArray(
          conversations.id,
          results.map((r) => r.id),
        ),
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
