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

  if (session.isAnonymous && session.anonymousSessionId) {
    searchParams.anonymousSessionId = session.anonymousSessionId;
  } else if (session.email) {
    searchParams.customer = [session.email];
  } else {
    return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });
  }

  const parsedParams = customerSearchSchema.safeParse({
    ...searchParams,
    limit: searchParams.limit ? parseInt(searchParams.limit) : PAGE_SIZE,
  });

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid search parameters", details: parsedParams.error.issues }, { status: 400 });
  }

  const filters = parsedParams.data;

  const { list } = await searchConversations(mailbox, filters);
  const { results, nextCursor } = await list;

  const conversations = results.map((conv) => ({
    slug: conv.slug,
    subject: conv.subject ?? "(no subject)",
    createdAt: conv.createdAt.toISOString(),
    latestMessage: conv.recentMessageText || null,
  }));

  return Response.json({
    conversations,
    nextCursor,
  });
});
