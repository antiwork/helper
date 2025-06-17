import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { assertDefinedOrRaiseNonRetriableError, triggerEvent } from "./utils";

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

type MailboxAutoCloseReport = {
  mailboxId: number;
  mailboxName: string;
  inactiveConversations: { id: number; slug: string }[];
  conversationsClosed: number;
  status: string;
};

export async function closeInactiveConversations(): Promise<AutoCloseReport> {
  const report: AutoCloseReport = {
    totalProcessed: 0,
    mailboxReports: [],
    status: "",
  };

  const enabledMailboxes = await db.query.mailboxes.findMany({
    where: eq(mailboxes.autoCloseEnabled, true),
    columns: {
      id: true,
      name: true,
    },
  });

  if (enabledMailboxes.length === 0) {
    report.status = "No mailboxes with auto-close enabled found";
    return report;
  }
  for (const mailbox of enabledMailboxes) {
    await triggerEvent("conversations/auto-close.process-mailbox", { mailboxId: mailbox.id });
  }

  report.status = `Scheduled auto-close check for ${enabledMailboxes.length} mailboxes`;
  return report;
}

export async function closeInactiveConversationsForMailbox({
  mailboxId,
}: {
  mailboxId: number;
}): Promise<MailboxAutoCloseReport> {
  const mailbox = assertDefinedOrRaiseNonRetriableError(
    await db.query.mailboxes.findFirst({
      where: and(eq(mailboxes.id, mailboxId), eq(mailboxes.autoCloseEnabled, true)),
      columns: {
        id: true,
        name: true,
        autoCloseDaysOfInactivity: true,
      },
    }),
  );

  const mailboxReport: MailboxAutoCloseReport = {
    mailboxId: mailbox.id,
    mailboxName: mailbox.name,
    inactiveConversations: [],
    conversationsClosed: 0,
    status: "",
  };

  const now = new Date();
  now.setMinutes(0, 0, 0);

  const daysOfInactivity = mailbox.autoCloseDaysOfInactivity;
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - daysOfInactivity);

  const conversationsToClose = await db.query.conversations.findMany({
    where: and(
      eq(conversations.mailboxId, mailbox.id),
      eq(conversations.status, "open"),
      lt(conversations.lastUserEmailCreatedAt, cutoffDate),
    ),
    columns: {
      id: true,
      slug: true,
    },
  });

  mailboxReport.inactiveConversations = conversationsToClose;

  if (conversationsToClose.length === 0) {
    mailboxReport.status = "No inactive conversations found";
    return mailboxReport;
  }

  for (const conversation of conversationsToClose) {
    await updateConversation(conversation.id, {
      set: {
        status: "closed",
        closedAt: now,
        updatedAt: now,
      },
      type: "auto_closed_due_to_inactivity",
      message: "Auto-closed due to inactivity",
    });
  }

  mailboxReport.conversationsClosed = conversationsToClose.length;
  mailboxReport.status = `Successfully closed ${conversationsToClose.length} conversations`;
  return mailboxReport;
}
