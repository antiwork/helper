import { classifyIntent, generateContent } from "@/lib/gemini/client";
import { postSlackMessage } from "@/lib/slack/client";
import { closeTickets, getStats, replyToTickets, searchTickets } from "./intents";
import { AgentAction, IntentParameters } from "./types";

// Process a message from Slack and return a response
export const processMessage = async (
  message: string,
  botToken: string,
  channel: string,
  threadTs?: string,
): Promise<string> => {
  try {
    const { intent, parameters } = await classifyIntent(message);

    const validatedIntent = validateIntentClassification(intent as AgentAction, parameters, message);

    let response: string;
    let blocks: any[] | undefined;

    // Dispatch to the appropriate intent handler
    switch (validatedIntent.intent) {
      case "search_tickets":
        const searchResult = await searchTickets(validatedIntent.parameters);
        response = searchResult.text;
        blocks = searchResult.blocks;
        break;
      case "get_stats":
        const statsResult = await getStats(validatedIntent.parameters);
        response = statsResult.text;
        blocks = statsResult.blocks;
        break;
      case "close_tickets":
        const closeResult = await closeTickets(validatedIntent.parameters);
        response = closeResult.text;
        blocks = closeResult.blocks;
        break;
      case "reply_to_tickets":
        const replyResult = await replyToTickets(validatedIntent.parameters);
        response = replyResult.text;
        blocks = replyResult.blocks;
        break;
      case "unknown":
      default:
        // Instead of generating a custom response, provide clear examples
        response = "I'm not sure what you're asking for. Here are some things I can help with:";
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*I'm not sure what you're asking for. Here are some things I can help with:*",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Find tickets:*\n• `Give me 5 tickets about login issues`\n• `Show me tickets regarding PayPal`\n• `Find open tickets about identity verification`",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Get statistics:*\n• `How many tickets have we answered in the last 24 hours?`\n• `Show ticket stats for this week`\n• `How many open tickets do we have?`",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Close tickets:*\n• `Close all open tickets older than 30 days about PayPal`\n• `Close tickets regarding login issues`",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Reply to tickets:*\n• `Reply to all open tickets regarding identity verification saying 'This issue has been resolved!'`\n• `Respond to tickets about login issues with 'Please try resetting your password'`",
            },
          },
        ];
        break;
    }
    if (blocks) {
      await postSlackMessage(botToken, {
        channel,
        text: response, // Fallback text
        blocks,
        thread_ts: threadTs,
      });
    } else {
      await postSlackMessage(botToken, {
        channel,
        text: response,
        thread_ts: threadTs,
      });
    }

    return response;
  } catch (error) {
    return "Sorry, I encountered an error while processing your request. Please try again later.";
  }
};

/**
 * Validates and corrects intent classification to prevent common misclassifications
 */
const validateIntentClassification = (
  intent: AgentAction,
  parameters: IntentParameters,
  message: string,
): { intent: AgentAction; parameters: IntentParameters } => {
  const validatedParams = { ...parameters };
  let validatedIntent = intent;

  if (intent === "reply_to_tickets" && !parameters.message) {
    validatedIntent = "search_tickets";
    // Keep the criteria if it exists
    if (parameters.criteria) {
      validatedParams.criteria = parameters.criteria;
    }
  }

  if (
    intent !== "search_tickets" &&
    (message.toLowerCase().includes("give me") ||
      message.toLowerCase().includes("show me") ||
      message.toLowerCase().includes("find") ||
      message.toLowerCase().includes("get"))
  ) {
    if (!message.toLowerCase().includes("reply") && !message.toLowerCase().includes("respond with")) {
      validatedIntent = "search_tickets";
    }
  }

  if (
    message.toLowerCase().includes("ticket") &&
    message.toLowerCase().includes("respond to") &&
    !message.toLowerCase().includes("saying")
  ) {
    validatedIntent = "search_tickets";
  }

  return { intent: validatedIntent, parameters: validatedParams };
};
