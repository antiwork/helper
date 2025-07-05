import { waitUntil } from "@vercel/functions";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withWidgetAuth } from "@/app/api/widget/utils";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { createReactionEventPayload } from "@/lib/data/dashboardEvent";
import { getMailbox } from "@/lib/data/mailbox";
import { dashboardChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

const MessageReactionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("thumbs-up"),
  }),
  z.object({
    type: z.literal("thumbs-down"),
    feedback: z.string().nullish(),
  }),
]);
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

  const message = await db
    .select({
      reactionType: conversationMessages.reactionType,
      reactionFeedback: conversationMessages.reactionFeedback,
      metadata: conversationMessages.metadata,
      conversation: {
        emailFrom: conversations.emailFrom,
      },
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(and(eq(conversationMessages.id, messageId), eq(conversations.slug, slug)))
    .limit(1)
    .then(takeUniqueOrThrow);

  if (!message || (message.conversation.emailFrom && message.conversation.emailFrom !== session.email)) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reactionResult = MessageReactionSchema.safeParse({
    ...body,
    messageId,
  });

  if (!reactionResult.success) {
    return Response.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const reaction = reactionResult.data;

  if (message.reactionType === "thumbs-down" && reaction.type === "thumbs-down" && message.reactionFeedback == null) {
    await db
      .update(conversationMessages)
      .set({
        reactionFeedback: reaction.feedback,
        reactionCreatedAt: new Date(),
      })
      .where(eq(conversationMessages.id, messageId));
    waitUntil(publishEvent(messageId));
    return Response.json({ reaction });
  }

  if (message.reactionType === reaction.type) {
    await db
      .update(conversationMessages)
      .set({
        reactionType: null,
        reactionFeedback: null,
        reactionCreatedAt: null,
      })
      .where(eq(conversationMessages.id, messageId));
    return Response.json({ reaction: null });
  }

  await db
    .update(conversationMessages)
    .set({
      reactionType: reaction.type,
      reactionFeedback: reaction.type === "thumbs-down" ? reaction.feedback : null,
      reactionCreatedAt: new Date(),
    })
    .where(eq(conversationMessages.id, messageId));
  waitUntil(publishEvent(messageId));

  return Response.json({ reaction });
});

const publishEvent = async (messageId: number) => {
  const message = assertDefined(
    await db.query.conversationMessages.findFirst({
      columns: {
        id: true,
        reactionType: true,
        reactionFeedback: true,
        reactionCreatedAt: true,
      },
      with: {
        conversation: {
          columns: { subject: true, emailFrom: true, slug: true },
          with: {
            platformCustomer: { columns: { value: true } },
          },
        },
      },
      where: eq(conversationMessages.id, messageId),
    }),
  );

  const mailbox = await getMailbox();
  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  await publishToRealtime({
    channel: dashboardChannelId(mailbox.slug),
    event: "event",
    data: createReactionEventPayload(message, mailbox),
  });
};
