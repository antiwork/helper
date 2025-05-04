import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateWidget } from "@/app/api/widget/utils";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations } from "@/db/schema";

const EventPayloadSchema = z.object({
  type: z.literal("reasoning_toggled"),
  changes: z.object({
    isVisible: z.boolean(),
  }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

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
    (message.conversation.emailFrom && message.conversation.emailFrom !== authResult.session.email) ||
    message.conversation.mailboxId !== authResult.mailbox.id
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
}
