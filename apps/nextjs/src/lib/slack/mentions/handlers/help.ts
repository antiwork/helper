import { postSlackMessage } from "../../client";

export const handleHelpRequest = async (channelId: string, messageTs: string, token: string) => {
  console.log("handleHelpRequest called with:", { channelId, messageTs, tokenLength: token?.length || 0 });

  try {
    console.log("Preparing help message blocks");
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Helper can assist you with the following:*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*1. Get tickets to respond to*\nExample: `@Helper give me 5 tickets about PayPal`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*2. View statistics*\nExample: `@Helper how many tickets have I answered in the last 24 hours?`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*3. Close tickets*\nExample: `@Helper close all open tickets older than 30 days about PayPal`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*4. Reply to tickets*\nExample: `@Helper reply to all open tickets regarding identity verification saying this issue has been resolved`",
        },
      },
    ];

    console.log("Sending help message to Slack");
    await postSlackMessage(token, {
      channel: channelId,
      thread_ts: messageTs,
      blocks,
    });
    console.log("Help message sent successfully");
  } catch (error) {
    console.error("Error sending help message:", error);
  }
};
