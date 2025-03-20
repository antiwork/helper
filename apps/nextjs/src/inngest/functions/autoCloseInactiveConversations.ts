import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationEvents, conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

async function closeInactiveConversations(mailboxId?: number) {
  const mailboxesQuery = mailboxId
    ? and(eq(mailboxes.id, mailboxId), eq(mailboxes.autoCloseEnabled, true))
    : eq(mailboxes.autoCloseEnabled, true);

  const enabledMailboxes = await db.query.mailboxes.findMany({
    where: mailboxesQuery,
    columns: {
      id: true,
      name: true,
      autoCloseDaysOfInactivity: true,
    },
  });

  if (enabledMailboxes.length === 0) {
    console.info("No mailboxes with auto-close enabled found");
    return { processed: 0 };
  }

  let totalClosed = 0;

  for (const mailbox of enabledMailboxes) {
    const daysOfInactivity = mailbox.autoCloseDaysOfInactivity;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOfInactivity);

    const conversationsToClose = await db.query.conversations.findMany({
      where: and(
        eq(conversations.mailboxId, mailbox.id),
        eq(conversations.status, "open"),
        lt(conversations.updatedAt, cutoffDate),
      ),
      columns: {
        id: true,
        slug: true,
      },
    });

    if (conversationsToClose.length === 0) {
      console.info(`No inactive conversations found for mailbox ${mailbox.name}`);
      continue;
    }

    console.info(`Found ${conversationsToClose.length} inactive conversations to close for mailbox ${mailbox.name}`);

    const now = new Date();

    await db
      .update(conversations)
      .set({
        status: "closed",
        closedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(conversations.mailboxId, mailbox.id),
          eq(conversations.status, "open"),
          lt(conversations.updatedAt, cutoffDate),
        ),
      );

    for (const conversation of conversationsToClose) {
      await db.insert(conversationEvents).values({
        conversationId: conversation.id,
        type: "update",
        changes: {
          status: "closed",
        },
        reason: "auto_closed_due_to_inactivity",
        createdAt: now,
        updatedAt: now,
      });
    }

    totalClosed += conversationsToClose.length;
  }

  return {
    processed: totalClosed,
    message: `Auto-closed ${totalClosed} inactive conversations`,
  };
}

/**
 * Scheduled auto-close function that runs daily
 */
const scheduledAutoClose = inngest.createFunction(
  { id: "scheduled-auto-close-inactive-conversations" },
  { cron: "0 0 * * *" },
  async () => {
    return await closeInactiveConversations();
  },
);

/**
 * API-triggered auto-close function
 */
const apiTriggeredAutoClose = inngest.createFunction(
  { id: "api-triggered-auto-close" },
  { event: "conversations/auto-close.check" },
  async ({ event }) => {
    const mailboxId = event.data.mailboxId;
    return await closeInactiveConversations(mailboxId);
  },
);

export default [scheduledAutoClose, apiTriggeredAutoClose];
