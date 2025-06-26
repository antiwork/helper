import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { searchSchema } from "@/lib/data/conversation/searchSchema";

const events = {
  "files/preview.generate": {
    data: z.object({
      fileId: z.number(),
    }),
    jobs: ["generateFilePreview"],
  },
  "conversations/embedding.create": {
    data: z.object({ conversationSlug: z.string() }),
    jobs: ["embeddingConversation"],
  },
  "conversations/message.created": {
    data: z.object({ messageId: z.number() }),
    jobs: [
      "indexConversationMessage",
      "generateConversationSummaryEmbeddings",
      "mergeSimilarConversations",
      "publishNewConversationEvent",
      "notifyVipMessage",
    ],
  },
  "conversations/email.enqueued": {
    data: z.object({
      messageId: z.number(),
    }),
    jobs: ["sendEmail"],
  },
  "conversations/auto-response.create": {
    data: z.object({
      messageId: z.number(),
    }),
    jobs: ["handleAutoResponse"],
  },
  "conversations/bulk-update": {
    data: z.object({
      mailboxId: z.number(),
      userId: z.string(),
      conversationFilter: z.union([z.array(z.number()), searchSchema]),
      status: z.enum(["open", "closed", "spam"]),
    }),
    jobs: ["bulkUpdateConversations"],
  },
  "conversations/update-suggested-actions": {
    data: z.object({
      conversationId: z.number(),
    }),
    jobs: ["updateSuggestedActions"],
  },
  "gmail/webhook.received": {
    data: z.object({
      body: z.any(),
      headers: z.any(),
    }),
    jobs: ["handleGmailWebhookEvent"],
  },
  "faqs/embedding.create": {
    data: z.object({
      faqId: z.number(),
    }),
    jobs: ["embeddingFaq"],
  },
  "gmail/import-recent-threads": {
    data: z.object({
      gmailSupportEmailId: z.number(),
    }),
    jobs: ["importRecentGmailThreads"],
  },
  "gmail/import-gmail-threads": {
    data: z.object({
      gmailSupportEmailId: z.number(),
      fromInclusive: z.string().datetime(),
      toInclusive: z.string().datetime(),
    }),
    jobs: ["importGmailThreads"],
  },
  "reports/weekly": {
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: ["generateMailboxWeeklyReport"],
  },
  "reports/daily": {
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: ["generateMailboxDailyReport"],
  },
  "websites/crawl.create": {
    data: z.object({
      websiteId: z.number(),
      crawlId: z.number(),
    }),
    jobs: ["crawlWebsite"],
  },
  "conversations/check-resolution": {
    data: z.object({
      conversationId: z.number(),
      messageId: z.number(),
    }),
    jobs: ["checkConversationResolution"],
  },
  "messages/flagged.bad": {
    data: z.object({
      messageId: z.number(),
      reason: z.string().nullable(),
    }),
    jobs: ["suggestKnowledgeBankChanges"],
  },
  "conversations/auto-close.check": {
    data: z.object({
      mailboxId: z.number().optional(),
    }),
    jobs: ["closeInactiveConversations"],
  },
  "conversations/auto-close.process-mailbox": {
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: ["closeInactiveConversationsForMailbox"],
  },
  "conversations/human-support-requested": {
    data: z.object({
      mailboxSlug: z.string(),
      conversationId: z.number(),
    }),
    jobs: ["autoAssignConversation", "publishRequestHumanSupport"],
  },
  "slack/agent.message": {
    data: z.object({
      slackUserId: z.string().nullable(),
      statusMessageTs: z.string(),
      agentThreadId: z.number(),
      confirmedReplyText: z.string().optional(),
    }),
    jobs: ["handleSlackAgentMessage"],
  },
};

export type EventName = keyof typeof events;
export type EventData<T extends EventName> = z.infer<(typeof events)[T]["data"]>;

export const triggerEvent = <T extends EventName>(
  event: T,
  data: EventData<T>,
  { sleepSeconds = 0 }: { sleepSeconds?: number } = {},
) => {
  const payloads = events[event].jobs.map((job) => ({ event, job, data }));
  return db.execute(
    sql`SELECT pgmq.send_batch('jobs', ARRAY[${sql.join(payloads, sql`,`)}]::jsonb[], ${sleepSeconds})`,
  );
};
