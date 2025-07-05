import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withWidgetAuth } from "@/app/api/widget/utils";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations } from "@/db/schema";

const EventPayloadSchema = z.object({
  type: z.literal("reasoning_toggled"),
  changes: z.object({
    isVisible: z.boolean(),
  }),
});
type Params = { id: string; slug: string };
export const POST = withWidgetAuth<Params>(async ({ request, context: { params } }, { session, mailbox }) => {
  const { id, slug } = await params;
  let messageId;
  try {
    const parsedId = z.coerce.bigint().parse(id);
    messageId = Number(parsedId);
  } catch {
    return Response.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const message = await db
    .select({
      id: conversationMessages.id,
      conversation: {
        id: conversations.id,
        emailFrom: conversations.emailFrom,
        mailboxId: conversations.mailboxId,
      },
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(and(eq(conversationMessages.id, messageId), eq(conversations.slug, slug)))
    .limit(1)
    .then(takeUniqueOrThrow);

  if (
    !message ||
    (message.conversation.emailFrom && message.conversation.emailFrom !== session.email) ||
    message.conversation.mailboxId !== mailbox.id
  ) {
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
    conversationId: message.conversation.id,
    type: event.type,
    changes: event.changes,
  });

  return Response.json({ success: true });
});
