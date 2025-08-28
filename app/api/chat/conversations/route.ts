import { and, count, inArray } from "drizzle-orm";
import { ConversationsResult } from "@helperai/client";
import { getCustomerFilterForSearch } from "@/app/api/chat/customerFilter";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { customerSearchSchema } from "@/lib/data/conversation/customerSearchSchema";
import { searchConversations } from "@/lib/data/conversation/search";
import { corsOptions, corsResponse, withWidgetAuth } from "../../widget/utils";

const PAGE_SIZE = 20;

export const OPTIONS = () => corsOptions("GET");

export const GET = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const url = new URL(request.url);

  const customerFilter = getCustomerFilterForSearch(session);
  if (!customerFilter) {
    return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });
  }

  const searchParams: Record<string, any> = Object.fromEntries(url.searchParams.entries());

  if (searchParams.status) {
    searchParams.status = searchParams.status.split(",");
  }

  const parsedParams = customerSearchSchema.safeParse({
    ...searchParams,
    limit: searchParams.limit ? parseInt(searchParams.limit) : PAGE_SIZE,
  });

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid search parameters", details: parsedParams.error.issues }, { status: 400 });
  }

  const { list } = await searchConversations(mailbox, { ...parsedParams.data, ...customerFilter });
  const { results, nextCursor } = await list;
  const messageCounts = await db
    .select({
      count: count(),
      conversationId: conversationMessages.conversationId,
    })
    .from(conversationMessages)
    .where(
      and(
        inArray(
          conversationMessages.conversationId,
          results.map((r) => r.id),
        ),
        inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
      ),
    )
    .groupBy(conversationMessages.conversationId);

  const conversations = results
    .map((conv) => ({
      slug: conv.slug,
      subject: conv.subject ?? "(no subject)",
      createdAt: conv.createdAt.toISOString(),
      latestMessage: conv.recentMessageText || null,
      latestMessageAt: conv.recentMessageAt?.toISOString() || null,
      messageCount: messageCounts.find((m) => m.conversationId === conv.id)?.count || 0,
      isEscalated: !conv.assignedToAI,
      isUnread:
        !!conv.recentMessageAt && (!conv.lastReadByCustomerAt || conv.recentMessageAt > conv.lastReadByCustomerAt),
    }))
    .filter((conv) => conv.messageCount > 0);

  return corsResponse<ConversationsResult>({
    conversations,
    nextCursor,
  });
});
