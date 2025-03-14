import { findUserViaSlack } from "@/lib/data/user";
import { handleAssignCommand } from "./assign";
import { handleCloseCommand } from "./close";
import { parseCommandArgs } from "./parser";
import { handleReplyCommand } from "./reply";
import { sendHelpMessage, sendSlackResponse } from "./response";
import { handleStatsCommand } from "./stats";
import { SlackCommandParams } from "./types";

export const handleSlackCommand = async ({ text, userId, channelId, responseUrl, mailbox }: SlackCommandParams) => {
  const args = parseCommandArgs(text);
  const command = args.command.toLowerCase();

  try {
    const userFromSlack = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, userId);

    if (!userFromSlack) {
      await sendSlackResponse(responseUrl, {
        response_type: "ephemeral",
        text: "You need to be a Helper user to use this command. Please make sure your Slack email matches your Helper email.",
      });
      return;
    }

    const user = {
      id: userFromSlack.id,
      fullName: userFromSlack.fullName || undefined,
    };

    switch (command) {
      case "assign":
        await handleAssignCommand(args, user, channelId, responseUrl, mailbox);
        break;
      case "stats":
        await handleStatsCommand(args, user, channelId, responseUrl, mailbox);
        break;
      case "close":
        await handleCloseCommand(args, user, channelId, responseUrl, mailbox);
        break;
      case "reply":
        await handleReplyCommand(args, user, channelId, responseUrl, mailbox);
        break;
      case "help":
      default:
        await sendHelpMessage(responseUrl);
        break;
    }
  } catch (error) {
    console.error("Error handling Slack command:", error);
    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "An error occurred while processing your command. Please try again.",
    });
  }
};
