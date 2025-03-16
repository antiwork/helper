import { NextResponse } from "next/server";
import { env } from "@/env";
import { processMessage } from "@/lib/slack/agent/core";

// Process interactive messages (button clicks)
export function handleInteractiveMessage(payload: any) {
  console.log("[SLACK_WEBHOOK] Processing interactive message:", JSON.stringify(payload));

  if (payload.type === "block_actions" && payload.actions && payload.actions.length > 0) {
    const action = payload.actions[0];

    if (action.action_id.startsWith("select_mailbox_")) {
      // Extract the action and mailbox ID from the button value
      // Format: "action|mailboxId|criteria|message"
      const parts = action.value.split("|");

      // The first two parts are always action type and mailbox ID
      const actionType = parts[0];
      const mailboxId = parts[1];

      // For the remaining parts, we need to reconstruct them
      // If there are more than 3 parts, the message contains pipe characters
      let criteria = "";
      let message = "";

      if (parts.length >= 3) {
        // If we have exactly 3 parts, the third part is the criteria
        if (parts.length === 3) {
          criteria = parts[2];
        }
        // If we have 4 or more parts, we need to determine where criteria ends and message begins
        else if (parts.length >= 4) {
          // For reply_to_tickets, the 4th part is the message
          if (actionType === "reply_to_tickets") {
            criteria = parts[2];
            // Combine all remaining parts as the message (in case it contains pipe characters)
            message = parts.slice(3).join("|");
          } else {
            // For other action types, all remaining parts are part of the criteria
            criteria = parts.slice(2).join("|");
          }
        }
      }

      // Construct a new message that includes the mailbox parameter
      let newMessage = "";

      switch (actionType) {
        case "search_tickets":
          newMessage = `search for ${criteria} in mailbox ${mailboxId}`;
          break;
        case "close_tickets":
          newMessage = `close tickets ${criteria} in mailbox ${mailboxId}`;
          break;
        case "reply_to_tickets":
          // Include the message in the reply_to_tickets action
          newMessage = `reply to tickets about ${criteria} in mailbox ${mailboxId}${message ? ` saying "${message}"` : ""}`;
          break;
        default:
          newMessage = `${actionType} in mailbox ${mailboxId}`;
      }

      // Process the new message
      if (newMessage && env.SLACK_BOT_TOKEN) {
        const channel = payload.channel.id;
        const threadTs = payload.message?.thread_ts || payload.message?.ts;
        const responseUrl = payload.response_url;

        if (responseUrl) {
          try {
            void fetch(responseUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: `Processing your request to ${getActionDescription(actionType, criteria)} in mailbox ID ${mailboxId}...`,
                replace_original: true,
              }),
            });
          } catch (error: unknown) {
            console.error("Error updating message:", error);
          }
        }

        void processMessage(newMessage, env.SLACK_BOT_TOKEN, channel, threadTs).catch((error: unknown) => {
          console.error("Error processing interactive message:", error);

          if (responseUrl) {
            void fetch(responseUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: `Error processing your request: ${error instanceof Error ? error.message : "Unknown error"}`,
                replace_original: true,
              }),
            }).catch((e: unknown) => console.error("Error sending error message:", e));
          }
        });
        return NextResponse.json({ text: "Processing your request..." });
      }
    } else if (action.action_id.startsWith("get_stats_")) {
      // Extract the mailbox name and timeframe from the button value
      // Format: "get_stats|mailboxName|timeframe"
      const [actionType, mailboxName, timeframe] = action.value.split("|");

      console.log(`[SLACK_WEBHOOK] Stats requested for mailbox: ${mailboxName}, timeframe: ${timeframe || "all"}`);

      // Construct a message to get stats for the specific mailbox
      const message = `get stats for ${mailboxName}${timeframe ? ` for ${timeframe}` : ""}`;

      // Process the new message
      if (message && env.SLACK_BOT_TOKEN) {
        const channel = payload.channel.id;
        const threadTs = payload.message?.thread_ts || payload.message?.ts;
        const responseUrl = payload.response_url;

        // First, update the original message to show we're processing
        if (responseUrl) {
          try {
            // Send a processing message to the response URL
            void fetch(responseUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: `Getting statistics for ${mailboxName}${timeframe ? ` for ${timeframe}` : ""}...`,
                replace_original: false, // Create a new message in the thread instead of replacing
              }),
            });
          } catch (error: unknown) {
            console.error("Error updating message:", error);
          }
        }

        void processMessage(message, env.SLACK_BOT_TOKEN, channel, threadTs).catch((error: unknown) => {
          console.error("Error processing stats request:", error);

          if (responseUrl) {
            void fetch(responseUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: `Error getting statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
                replace_original: false,
              }),
            }).catch((e: unknown) => console.error("Error sending error message:", e));
          }
        });

        return NextResponse.json({ text: "Getting statistics..." });
      }
    }
  }

  return NextResponse.json({ error: "Unhandled interactive message" }, { status: 400 });
}

function getActionDescription(actionType: string, criteria: string): string {
  switch (actionType) {
    case "search_tickets":
      return `search for "${criteria}"`;
    case "close_tickets":
      return `close tickets ${criteria}`;
    case "reply_to_tickets":
      return `reply to tickets about "${criteria}"`;
    default:
      return actionType;
  }
}
