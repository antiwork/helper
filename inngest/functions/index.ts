import { z } from "zod";
import { defineEvent } from "@/inngest/utils";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { autoAssignConversation } from "./autoAssignConversation";
import { closeInactiveConversations, closeInactiveConversationsForMailbox } from "./autoCloseInactiveConversations";
import { bulkEmbeddingClosedConversations } from "./bulkEmbeddingClosedConversations";
import { bulkUpdateConversations } from "./bulkUpdateConversations";
import { checkAssignedTicketResponseTimes } from "./checkAssignedTicketResponseTimes";
import { checkConversationResolution } from "./checkConversationResolution";
import { checkVipResponseTimes } from "./checkVipResponseTimes";
import { cleanupDanglingFiles } from "./cleanupDanglingFiles";
import { crawlWebsite } from "./crawlWebsite";
import { embeddingConversation } from "./embeddingConversation";
import { embeddingFaq } from "./embeddingFaq";
import { generateConversationSummaryEmbeddings } from "./generateConversationSummaryEmbeddings";
import { generateDailyReports, generateMailboxDailyReport } from "./generateDailyReports";
import { generateFilePreview } from "./generateFilePreview";
import { generateMailboxWeeklyReport, generateWeeklyReports } from "./generateWeeklyReports";
import { handleAutoResponse } from "./handleAutoResponse";
import { handleGmailWebhookEvent } from "./handleGmailWebhookEvent";
import { handleSlackAgentMessage } from "./handleSlackAgentMessage";
import { importGmailThreads } from "./importGmailThreads";
import { importRecentGmailThreads } from "./importRecentGmailThreads";
import { indexConversationMessage } from "./indexConversation";
import { mergeSimilarConversations } from "./mergeSimilarConversations";
import { notifyVipMessage } from "./notifyVipMessage";
import { postEmailToGmail } from "./postEmailToGmail";
import { publishNewConversationEvent } from "./publishNewConversationEvent";
import { publishRequestHumanSupport } from "./publishRequestHumanSupport";
import { renewMailboxWatches } from "./renewMailboxWatches";
import { scheduledWebsiteCrawl } from "./scheduledWebsiteCrawl";
import { suggestKnowledgeBankChanges } from "./suggestKnowledgeBankChanges";
import { updateSuggestedActions } from "./updateSuggestedActions";

export const eventJobs = {
  "files/preview.generate": defineEvent({
    data: z.object({
      fileId: z.number(),
    }),
    jobs: { generateFilePreview },
  }),
  "conversations/embedding.create": defineEvent({
    data: z.object({ conversationSlug: z.string() }),
    jobs: { embeddingConversation },
  }),
  "conversations/message.created": defineEvent({
    data: z.object({ messageId: z.number() }),
    jobs: {
      indexConversationMessage,
      generateConversationSummaryEmbeddings,
      mergeSimilarConversations,
      publishNewConversationEvent,
      notifyVipMessage,
    },
  }),
  "conversations/email.enqueued": defineEvent({
    data: z.object({
      messageId: z.number(),
    }),
    jobs: { postEmailToGmail },
  }),
  "conversations/auto-response.create": defineEvent({
    data: z.object({
      messageId: z.number(),
    }),
    jobs: { handleAutoResponse },
  }),
  "conversations/bulk-update": defineEvent({
    data: z.object({
      mailboxId: z.number(),
      userId: z.string(),
      conversationFilter: z.union([z.array(z.number()), searchSchema]),
      status: z.enum(["open", "closed", "spam"]),
    }),
    jobs: { bulkUpdateConversations },
  }),
  "conversations/update-suggested-actions": defineEvent({
    data: z.object({
      conversationId: z.number(),
    }),
    jobs: { updateSuggestedActions },
  }),
  "gmail/webhook.received": defineEvent({
    data: z.object({
      body: z.any(),
      headers: z.any(),
    }),
    jobs: { handleGmailWebhookEvent },
  }),
  "faqs/embedding.create": defineEvent({
    data: z.object({
      faqId: z.number(),
    }),
    jobs: { embeddingFaq },
  }),
  "gmail/import-recent-threads": defineEvent({
    data: z.object({
      gmailSupportEmailId: z.number(),
    }),
    jobs: { importRecentGmailThreads },
  }),
  "gmail/import-gmail-threads": defineEvent({
    data: z.object({
      gmailSupportEmailId: z.number(),
      fromInclusive: z.string().datetime(),
      toInclusive: z.string().datetime(),
    }),
    jobs: { importGmailThreads },
  }),
  "reports/weekly": defineEvent({
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: { generateMailboxWeeklyReport },
  }),
  "reports/daily": defineEvent({
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: { generateMailboxDailyReport },
  }),
  "websites/crawl.create": defineEvent({
    data: z.object({
      websiteId: z.number(),
      crawlId: z.number(),
    }),
    jobs: { crawlWebsite },
  }),
  "conversations/check-resolution": defineEvent({
    data: z.object({
      conversationId: z.number(),
      messageId: z.number(),
    }),
    jobs: { checkConversationResolution },
  }),
  "messages/flagged.bad": defineEvent({
    data: z.object({
      messageId: z.number(),
      reason: z.string().nullable(),
    }),
    jobs: { suggestKnowledgeBankChanges },
  }),
  "conversations/auto-close.check": defineEvent({
    data: z.object({
      mailboxId: z.number().optional(),
    }),
    jobs: { closeInactiveConversations },
  }),
  "conversations/auto-close.process-mailbox": defineEvent({
    data: z.object({
      mailboxId: z.number(),
    }),
    jobs: { closeInactiveConversationsForMailbox },
  }),
  "conversations/human-support-requested": defineEvent({
    data: z.object({
      mailboxSlug: z.string(),
      conversationId: z.number(),
    }),
    jobs: { autoAssignConversation, publishRequestHumanSupport },
  }),
  "slack/agent.message": defineEvent({
    data: z.object({
      slackUserId: z.string().nullable(),
      statusMessageTs: z.string(),
      agentThreadId: z.number(),
      confirmedReplyText: z.string().optional(),
    }),
    jobs: { handleSlackAgentMessage },
  }),
};

export const cronJobs = {
  "0 19 * * *": { bulkEmbeddingClosedConversations },
  "0 * * * *": {
    checkAssignedTicketResponseTimes,
    checkVipResponseTimes,
    cleanupDanglingFiles,
    closeInactiveConversations,
  },
  "0 0 * * *": { renewMailboxWatches },
  "0 0 * * 0": { scheduledWebsiteCrawl },
  "0 16 * * 0,2-6": { generateDailyReports },
  "0 16 * * 1": { generateWeeklyReports },
};
