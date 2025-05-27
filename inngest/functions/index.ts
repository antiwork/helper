import autoAssignConversation from "@/inngest/functions/autoAssignConversation";
import autoCloseInactiveConversationsFunctions from "./autoCloseInactiveConversations";
import bulkEmbeddingClosedConversations from "./bulkEmbeddingClosedConversations";
import bulkUpdateConversations from "./bulkUpdateConversations";
import checkAssignedTicketResponseTimes from "./checkAssignedTicketResponseTimes";
import checkConversationResolution from "./checkConversationResolution";
import checkVipResponseTimes from "./checkVipResponseTimes";
import cleanupDanglingFiles from "./cleanupDanglingFiles";
import crawlWebsite from "./crawlWebsite";
import embeddingConversation from "./embeddingConversation";
import embeddingFaq from "./embeddingFaq";
import generateConversationSummaryEmbeddings from "./generateConversationSummaryEmbeddings";
import generateDailyReports, { generateMailboxDailyReport } from "./generateDailyReports";
import generateFilePreview from "./generateFilePreview";
import generateWeeklyReports, { generateMailboxWeeklyReport } from "./generateWeeklyReports";
import handleAutoResponse from "./handleAutoResponse";
import handleGmailWebhookEvent from "./handleGmailWebhookEvent";
import handleSlackAgentMessage from "./handleSlackAgentMessage";
import importGmailThreads from "./importGmailThreads";
import importRecentGmailThreads from "./importRecentGmailThreads";
import indexConversationMessage from "./indexConversation";
import mergeSimilarConversations from "./mergeSimilarConversations";
import notifyVipMessage from "./notifyVipMessage";
import postEmailToGmail from "./postEmailToGmail";
import publishNewConversationEvent from "./publishNewConversationEvent";
import renewMailboxWatches from "./renewMailboxWatches";
import scheduledWebsiteCrawl from "./scheduledWebsiteCrawl";
import suggestKnowledgeBankChanges from "./suggestKnowledgeBankChanges";
import updateSuggestedActions from "./updateSuggestedActions";

export default [
  indexConversationMessage,
  embeddingConversation,
  bulkEmbeddingClosedConversations,
  embeddingFaq,
  generateFilePreview,
  generateConversationSummaryEmbeddings,
  mergeSimilarConversations,
  publishNewConversationEvent,
  cleanupDanglingFiles,
  postEmailToGmail,
  handleGmailWebhookEvent,
  handleAutoResponse,
  importRecentGmailThreads,
  importGmailThreads,
  renewMailboxWatches,
  generateWeeklyReports,
  generateMailboxWeeklyReport,
  notifyVipMessage,
  bulkUpdateConversations,
  crawlWebsite,
  scheduledWebsiteCrawl,
  generateDailyReports,
  generateMailboxDailyReport,
  checkVipResponseTimes,
  checkAssignedTicketResponseTimes,
  suggestKnowledgeBankChanges,
  checkConversationResolution,
  ...autoCloseInactiveConversationsFunctions,
  updateSuggestedActions,
  autoAssignConversation,
  handleSlackAgentMessage,
];
