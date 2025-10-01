import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getConversation } from "@/app/api/chat/getConversation";
import { withWidgetAuth } from "@/app/api/widget/utils";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages } from "@/db/schema";

const EventPayloadSchema = z.object({
  type: z.literal("reasoning_toggled"),
  changes: z.object({
    isVisible: z.boolean(),
  }),
});
type Params = { id: string; slug: string };
export const POST = withWidgetAuth<Params>(async ({ request, context: { params } }, { session }) => {
  const { id, slug } = await params;
  let messageId;
  try {
    const parsedId = z.coerce.bigint().parse(id);
    messageId = Number(parsedId);
  } catch {
    return Response.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const conversation = await getConversation(slug, session);

  const message = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(and(eq(conversationMessages.id, messageId), eq(conversationMessages.conversationId, conversation.id)))
    .limit(1)
    .then(takeUniqueOrThrow);

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventResult = EventPayloadSchema.safeParse(body);
  if (!eventResult.success) {
    return Response.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const event = eventResult.data;

  await db.insert(conversationEvents).values({
    conversationId: conversation.id,
    type: event.type,
    changes: event.changes,
  });

  return Response.json({ success: true });
});
