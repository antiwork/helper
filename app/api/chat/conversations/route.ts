import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations as conversationsTable } from "@/db/schema";
import { customerSearchSchema } from "@/lib/data/conversation/customerSearchSchema";
import { searchConversations } from "@/lib/data/conversation/search";
import { withWidgetAuth } from "../../widget/utils";

const PAGE_SIZE = 20;

export const GET = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const url = new URL(request.url);

  const searchParams: Record<string, any> = Object.fromEntries(url.searchParams.entries());

  if (searchParams.status) {
    searchParams.status = searchParams.status.split(",");
  }
  if (searchParams.customer) {
    searchParams.customer = searchParams.customer.split(",");
  }

  const parsedParams = customerSearchSchema.safeParse({
    ...searchParams,
    limit: searchParams.limit ? parseInt(searchParams.limit) : PAGE_SIZE,
  });

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid search parameters", details: parsedParams.error.issues }, { status: 400 });
  }

  const filters = parsedParams.data;

  const hasSearchParams = Object.keys(searchParams).some(
    (key) => key !== "cursor" && key !== "limit" && searchParams[key],
  );

  if (hasSearchParams) {
    const { list } = await searchConversations(mailbox, filters);
    const { results, nextCursor } = await list;

    const userConversations = results.filter((conv) => {
      if (session.isAnonymous && session.anonymousSessionId) {
        return (conv as any).anonymousSessionId === session.anonymousSessionId;
      } else if (session.email) {
        return conv.emailFrom === session.email;
      }
      return false;
    });

    const conversations = userConversations.map((conv) => ({
      slug: conv.slug,
      subject: conv.subject ?? "(no subject)",
      createdAt: conv.createdAt.toISOString(),
      firstMessage: conv.recentMessageText || null,
    }));

    return Response.json({
      conversations,
      nextCursor,
    });
  }

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
