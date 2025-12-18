import { sql } from "drizzle-orm";
import superjson from "superjson";
import { z } from "zod";
import { toolBodySchema } from "@helperai/client";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema/jobRuns";
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
      "publishNewMessageEvent",
      "notifyVipMessage",
      "categorizeConversationToIssueGroup",
    ],
  },
  "conversations/email.enqueued": {
    data: z.object({
      messageId: z.number(),
    }),
    jobs: ["postEmailToGmail"],
  },
  "conversations/auto-response.create": {
    data: z.object({
      messageId: z.number(),
      tools: z.record(z.string(), toolBodySchema).optional(),
      customerInfoUrl: z.string().nullish(),
    }),
    jobs: ["handleAutoResponse"],
  },
  "conversations/bulk-update": {
    data: z.object({
      userId: z.string(),
      conversationFilter: z.union([z.array(z.number()), searchSchema]),
      status: z.enum(["open", "closed", "spam"]).optional(),
      assignedToId: z.string().optional(),
      assignedToAI: z.boolean().optional(),
      message: z.string().optional(),
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
    data: z.object({}),
    jobs: ["generateMailboxWeeklyReport"],
  },
  "reports/daily": {
    data: z.object({}),
    jobs: ["generateMailboxDailyReport"],
  },
  "websites/crawl.create": {
    data: z.object({
      websiteId: z.number(),
      crawlId: z.number(),
    }),
    jobs: ["crawlWebsite"],
  },
  "messages/flagged.bad": {
    data: z.object({
      messageId: z.number(),
      reason: z.string().nullable(),
    }),
    jobs: ["suggestKnowledgeBankChanges"],
  },
  "conversations/auto-close.check": {
    data: z.object({}),
    jobs: ["closeInactiveConversations"],
  },
  "conversations/auto-close.process-mailbox": {
    data: z.object({}),
    jobs: ["closeInactiveConversationsForMailbox"],
  },
  "conversations/human-support-requested": {
    data: z.object({
      conversationId: z.number(),
    }),
    jobs: ["autoAssignConversation", "publishRequestHumanSupport"],
  },
  "slack/agent.message": {
    data: z.object({
      slackUserId: z.string().nullable(),
      statusMessageTs: z.string(),
      agentThreadId: z.number(),
      confirmedReplyText: z.string().nullish(),
      confirmedKnowledgeBaseEntry: z.string().nullish(),
    }),
    jobs: ["handleSlackAgentMessage"],
  },
  "conversations/send-follower-notification": {
    data: z.object({
      conversationId: z.number(),
      eventType: z.enum(["new_message", "status_change", "assignment_change", "note_added"]),
      triggeredByUserId: z.string(),
      eventDetails: z.object({
        message: z.string().optional(),
        oldStatus: z.string().optional(),
        newStatus: z.string().optional(),
        oldAssignee: z.string().optional(),
        newAssignee: z.string().optional(),
        note: z.string().optional(),
      }),
    }),
    jobs: ["sendFollowerNotification"],
  },
};

export type EventName = keyof typeof events;
export type EventData<T extends EventName> = z.infer<(typeof events)[T]["data"]>;

export const triggerEvent = async <T extends EventName>(
  event: T,
  data: EventData<T>,
  { sleepSeconds = 0 }: { sleepSeconds?: number } = {},
) => {
  await db.transaction(async (tx) => {
    const runs = await tx
      .insert(jobRuns)
      .values(
        events[event].jobs.map((job) => ({
          job,
          event,
          data,
        })),
      )
      .returning();
    const payloads = events[event].jobs.map((job) => ({
      event,
      job,
      data: superjson.serialize(data),
      jobRunId: assertDefined(runs.find((run) => run.job === job)).id,
    }));
    await tx.execute(
      sql`SELECT pgmq.send_batch('jobs', ARRAY[${sql.join(payloads, sql`,`)}]::jsonb[], ${sleepSeconds})`,
    );
  });
};
