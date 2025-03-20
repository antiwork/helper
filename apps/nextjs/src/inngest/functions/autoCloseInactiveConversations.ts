import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationEvents, conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

type AutoCloseReport = {
  totalProcessed: number;
  mailboxReports: {
    mailboxId: number;
    mailboxName: string;
    inactiveConversations: { id: number; slug: string }[];
    conversationsClosed: number;
    status: string;
  }[];
  status: string;
};

async function closeInactiveConversations(mailboxId?: number): Promise<AutoCloseReport> {
  const report: AutoCloseReport = {
    totalProcessed: 0,
    mailboxReports: [],
    status: "",
  };

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
    report.status = "No mailboxes with auto-close enabled found";
    return report;
  }

  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (const mailbox of enabledMailboxes) {
    const mailboxReport = {
      mailboxId: mailbox.id,
      mailboxName: mailbox.name,
      inactiveConversations: [] as { id: number; slug: string }[],
      conversationsClosed: 0,
      status: "",
    };

    const daysOfInactivity = mailbox.autoCloseDaysOfInactivity;
    const cutoffDate = new Date(now);
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

    mailboxReport.inactiveConversations = conversationsToClose;

    if (conversationsToClose.length === 0) {
      mailboxReport.status = "No inactive conversations found";
      report.mailboxReports.push(mailboxReport);
      continue;
    }

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

    mailboxReport.conversationsClosed = conversationsToClose.length;
    mailboxReport.status = `Successfully closed ${conversationsToClose.length} conversations`;
    report.mailboxReports.push(mailboxReport);
    report.totalProcessed += conversationsToClose.length;
  }

  report.status = `Auto-closed ${report.totalProcessed} inactive conversations across ${report.mailboxReports.length} mailboxes`;
  return report;
}

/**
 * Scheduled auto-close function that runs hourly
 */
const scheduledAutoClose = inngest.createFunction(
  { id: "scheduled-auto-close-inactive-conversations" },
  { cron: "0 * * * *" },
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
