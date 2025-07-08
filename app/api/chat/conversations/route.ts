import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations as conversationsTable } from "@/db/schema";
import { withWidgetAuth } from "../../widget/utils";

const PAGE_SIZE = 20;

export const GET = withWidgetAuth(async ({ request }, { session }) => {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  let baseCondition;
  if (session.isAnonymous && session.anonymousSessionId) {
    baseCondition = eq(conversationsTable.anonymousSessionId, session.anonymousSessionId);
  } else if (session.email) {
    baseCondition = eq(conversationsTable.emailFrom, session.email);
  } else {
    return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });
  }

  const whereClause = cursor ? and(baseCondition, lt(conversationsTable.createdAt, new Date(cursor))) : baseCondition;
  const userConversations = await db.query.conversations.findMany({
    where: whereClause,
    orderBy: [desc(conversationsTable.createdAt)],
    limit: PAGE_SIZE + 1,
    with: {
      messages: {
        limit: 1,
        orderBy: [asc(conversationsTable.createdAt)],
      },
    },
  });

  const hasMore = userConversations.length > PAGE_SIZE;
  const conversations = userConversations.slice(0, PAGE_SIZE).map((conv) => ({
    slug: conv.slug,
    subject: conv.subject ?? "(no subject)",
    createdAt: conv.createdAt.toISOString(),
    firstMessage: conv.messages[0]?.cleanedUpText || conv.messages[0]?.body || null,
  }));

  const nextCursor = hasMore ? userConversations[PAGE_SIZE - 1]!.createdAt.toISOString() : null;

  return Response.json({
    conversations,
    nextCursor,
  });
});
