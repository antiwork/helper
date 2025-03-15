import { findUserViaSlack } from "@/lib/data/user";
import { postSlackMessage } from "../client";
import { handleAssignRequest } from "./handlers/assign";
import { handleCloseRequest } from "./handlers/close";
import { handleHelpRequest } from "./handlers/help";
import { handleReplyRequest } from "./handlers/reply";
import { handleStatsRequest } from "./handlers/stats";
import { SlackMentionParams } from "./types";

export const handleSlackMention = async ({ text, userId, channelId, messageTs, mailbox }: SlackMentionParams) => {
  try {
    console.log("handleSlackMention called with:", { text, userId, channelId, messageTs, mailboxId: mailbox.id });

    console.log("Finding user via Slack with:", {
      clerkOrganizationId: mailbox.clerkOrganizationId,
      slackUserId: userId,
    });

    const userFromSlack = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, userId);
    console.log("User from Slack:", userFromSlack);

    if (!userFromSlack) {
      console.log("No user found from Slack, sending error message");
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: "You need to be a Helper user to use this feature. Please make sure your Slack email matches your Helper email.",
      });
      return;
    }

    const user = {
      id: userFromSlack.id,
      fullName: userFromSlack.fullName || undefined,
    };
    console.log("Created user object:", user);

    // Remove the mention part from the text (e.g., "<@U12345> give me tickets" -> "give me tickets")
    const cleanedText = text.replace(/<@[A-Z0-9]+>/, "").trim();
    console.log("Cleaned text:", cleanedText);

    // Simple intent detection based on keywords
    console.log("Detecting intent from text");
    if (isHelpRequest(cleanedText)) {
      console.log("Detected help request");
      await handleHelpRequest(channelId, messageTs, mailbox.slackBotToken);
    } else if (isAssignRequest(cleanedText)) {
      console.log("Detected assign request");
      await handleAssignRequest(cleanedText, user, channelId, messageTs, mailbox);
    } else if (isStatsRequest(cleanedText)) {
      console.log("Detected stats request");
      await handleStatsRequest(cleanedText, user, channelId, messageTs, mailbox);
    } else if (isCloseRequest(cleanedText)) {
      console.log("Detected close request");
      await handleCloseRequest(cleanedText, user, channelId, messageTs, mailbox);
    } else if (isReplyRequest(cleanedText)) {
      console.log("Detected reply request");
      await handleReplyRequest(cleanedText, user, channelId, messageTs, mailbox);
    } else {
      console.log("No specific intent detected, showing help");
      await handleHelpRequest(channelId, messageTs, mailbox.slackBotToken);
    }

    console.log("Successfully handled Slack mention");
  } catch (error) {
    console.error("Error handling Slack mention:", error);
    try {
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: "An error occurred while processing your request. Please try again.",
      });
    } catch (sendError) {
      console.error("Error sending error message:", sendError);
    }
  }
};

// Simple intent detection functions
const isHelpRequest = (text: string): boolean => {
  const helpPatterns = [/help/i, /how to/i, /what can you do/i, /commands/i, /usage/i, /guide/i];
  const result = helpPatterns.some((pattern) => pattern.test(text));
  console.log(`isHelpRequest check for "${text}": ${result}`);
  return result;
};

const isAssignRequest = (text: string): boolean => {
  const assignPatterns = [
    /give me (\d+)? tickets?/i,
    /assign (\d+)? tickets?/i,
    /find (\d+)? tickets?/i,
    /get (\d+)? tickets?/i,
  ];
  const result = assignPatterns.some((pattern) => pattern.test(text));
  console.log(`isAssignRequest check for "${text}": ${result}`);
  return result;
};

const isStatsRequest = (text: string): boolean => {
  const statsPatterns = [/how many tickets/i, /ticket stats/i, /statistics/i, /metrics/i, /performance/i];
  const result = statsPatterns.some((pattern) => pattern.test(text));
  console.log(`isStatsRequest check for "${text}": ${result}`);
  return result;
};

const isCloseRequest = (text: string): boolean => {
  const closePatterns = [/close (\w+)? tickets?/i, /close all/i, /mark (\w+)? as closed/i];
  const result = closePatterns.some((pattern) => pattern.test(text));
  console.log(`isCloseRequest check for "${text}": ${result}`);
  return result;
};

const isReplyRequest = (text: string): boolean => {
  const replyPatterns = [/reply to (\w+)? tickets?/i, /respond to (\w+)? tickets?/i, /send (\w+)? message/i];
  const result = replyPatterns.some((pattern) => pattern.test(text));
  console.log(`isReplyRequest check for "${text}": ${result}`);
  return result;
};
