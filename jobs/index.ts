import { autoAssignConversation } from "./autoAssignConversation";
import { closeInactiveConversations, closeInactiveConversationsForMailbox } from "./autoCloseInactiveConversations";
import { closeSuspendedUserTickets } from "./autoCloseSuspendedUserTickets";
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

// Linked to events in trigger.ts
export const eventJobs = {
  generateFilePreview,
  embeddingConversation,
  indexConversationMessage,
  generateConversationSummaryEmbeddings,
  mergeSimilarConversations,
  publishNewConversationEvent,
  notifyVipMessage,
  postEmailToGmail,
  handleAutoResponse,
  bulkUpdateConversations,
  updateSuggestedActions,
  handleGmailWebhookEvent,
  embeddingFaq,
  importRecentGmailThreads,
  importGmailThreads,
  generateMailboxWeeklyReport,
  generateMailboxDailyReport,
  crawlWebsite,
  checkConversationResolution,
  suggestKnowledgeBankChanges,
  closeInactiveConversations,
  closeInactiveConversationsForMailbox,
  closeSuspendedUserTickets,
  autoAssignConversation,
  publishRequestHumanSupport,
  handleSlackAgentMessage,
};

export const cronJobs = {
  "0 19 * * *": { bulkEmbeddingClosedConversations },
  "0 * * * *": {
    cleanupDanglingFiles,
    closeInactiveConversations,
    closeSuspendedUserTickets,
  },
  "0 14 * * 1-5": {
    checkAssignedTicketResponseTimes,
    checkVipResponseTimes,
  },
  "0 0 * * *": { renewMailboxWatches },
  "0 0 * * 0": { scheduledWebsiteCrawl },
  "0 16 * * 0,2-6": { generateDailyReports },
  "0 16 * * 1": { generateWeeklyReports },
};
