import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations as conversationsTable } from "@/db/schema";
import { authenticateWidget } from "../../widget/utils";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const authResult = await authenticateWidget(req);
  if (!authResult.success) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  if (!authResult.session.email) {
    return Response.json({ error: "Not authorized - Anonymous session" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");

  const baseCondition = eq(conversationsTable.emailFrom, authResult.session.email);
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
}
