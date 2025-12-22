import { autoAssignConversation } from "./autoAssignConversation";
import { closeInactiveConversations, closeInactiveConversationsForMailbox } from "./autoCloseInactiveConversations";
import { bulkEmbeddingClosedConversations } from "./bulkEmbeddingClosedConversations";
import { bulkUpdateConversations } from "./bulkUpdateConversations";
import { categorizeConversationToIssueGroup } from "./categorizeConversationToIssueGroup";
import { checkAssignedTicketResponseTimes } from "./checkAssignedTicketResponseTimes";
import { checkStaleJobs } from "./checkStaleJobs";
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
import { publishNewMessageEvent } from "./publishNewMessageEvent";
import { publishRequestHumanSupport } from "./publishRequestHumanSupport";
import { renewMailboxWatches } from "./renewMailboxWatches";
import { scheduledWebsiteCrawl } from "./scheduledWebsiteCrawl";
import { sendFollowerNotification } from "./sendFollowerNotification";
import { suggestKnowledgeBankChanges } from "./suggestKnowledgeBankChanges";
import { updateSuggestedActions } from "./updateSuggestedActions";

// Linked to events in trigger.ts
export const eventJobs = {
  generateFilePreview,
  embeddingConversation,
  indexConversationMessage,
  generateConversationSummaryEmbeddings,
  mergeSimilarConversations,
  publishNewMessageEvent,
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
  suggestKnowledgeBankChanges,
  closeInactiveConversations,
  closeInactiveConversationsForMailbox,
  autoAssignConversation,
  categorizeConversationToIssueGroup,
  publishRequestHumanSupport,
  handleSlackAgentMessage,
  sendFollowerNotification,
};

export const cronJobs = {
  "*/5 * * * *": { checkStaleJobs },
  "0 19 * * *": { bulkEmbeddingClosedConversations },
  "0 * * * *": {
    cleanupDanglingFiles,
    closeInactiveConversations,
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
