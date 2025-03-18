import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationEvents, conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

/**
 * Common function to auto-close inactive conversations
 */
async function closeInactiveConversations(mailboxId?: number) {
  // Get all mailboxes with auto-close enabled or a specific mailbox if provided
  const mailboxesQuery = mailboxId
    ? and(eq(mailboxes.id, mailboxId), eq(mailboxes.autoCloseEnabled, true))
    : eq(mailboxes.autoCloseEnabled, true);

  // Get all mailboxes with auto-close enabled
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

  // Process each mailbox
  for (const mailbox of enabledMailboxes) {
    const daysOfInactivity = mailbox.autoCloseDaysOfInactivity || 14; // Default to 14 days if not set

    // Calculate the cutoff date based on days of inactivity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOfInactivity);

    console.log("--------------------------------");
    console.log("cutoffDate", cutoffDate);
    console.log("mailbox.id", mailbox.id);
    console.log("mailbox.name", mailbox.name);
    console.log("--------------------------------");

    // Find open conversations with no activity since the cutoff date
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

    // Close the conversations
    const now = new Date();

    // Update conversations to closed status
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

    // Create conversation events for each closed conversation
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
  // TODO: Change to daily at midnight
  { cron: "* * * * *" }, // Run daily at midnight
  async () => {
    return await closeInactiveConversations();
  },
);

closeInactiveConversations();

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
