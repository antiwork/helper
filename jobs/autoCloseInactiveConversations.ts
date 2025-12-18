import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { triggerEvent } from "./trigger";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

type AutoCloseReport = {
  totalProcessed: number;
  mailboxReports: {
    mailboxName: string;
    inactiveConversations: { id: number; slug: string }[];
    conversationsClosed: number;
    status: string;
  }[];
  status: string;
};

type MailboxAutoCloseReport = {
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

  await triggerEvent("conversations/auto-close.process-mailbox", {});

  report.status = `Scheduled auto-close check for ${enabledMailboxes.length} mailboxes`;
  return report;
}

export async function closeInactiveConversationsForMailbox(): Promise<MailboxAutoCloseReport> {
  const mailbox = assertDefinedOrRaiseNonRetriableError(
    await db.query.mailboxes.findFirst({
      where: eq(mailboxes.autoCloseEnabled, true),
      columns: {
        id: true,
        name: true,
        autoCloseDaysOfInactivity: true,
      },
    }),
  );

  const mailboxReport: MailboxAutoCloseReport = {
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
    where: and(eq(conversations.status, "open"), lt(conversations.lastUserEmailCreatedAt, cutoffDate)),
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
      set: { status: "closed" },
      type: "auto_closed_due_to_inactivity",
      message: "Auto-closed due to inactivity",
    });
  }

  mailboxReport.conversationsClosed = conversationsToClose.length;
  mailboxReport.status = `Successfully closed ${conversationsToClose.length} conversations`;
  return mailboxReport;
}
