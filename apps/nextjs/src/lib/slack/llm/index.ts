import { postSlackMessage } from "@/lib/slack/client";
import { DEFAULT_PROVIDER, type LLMProvider } from "./providers";
import { formatSearchResults, searchTickets } from "./search";

export * from "./providers";
export * from "./prompts";
export * from "./search";

/**
 * Main function to process a natural language query from Slack
 */
export async function processNaturalLanguageQuery(
  query: string,
  mailboxId: number,
  slackBotToken: string,
  channelId: string,
  requestedProvider: LLMProvider = DEFAULT_PROVIDER,
): Promise<void> {
  try {
    const results = await searchTickets(mailboxId, query, requestedProvider);
    console.log("results", results);

    const formattedResponse = await formatSearchResults(results, query, requestedProvider);

    await postSlackMessage(slackBotToken, {
      channel: channelId,
      text: formattedResponse,
      mrkdwn: true,
    });
  } catch (error) {
    console.error("Error processing natural language query:", error);

    await postSlackMessage(slackBotToken, {
      channel: channelId,
      text: "Sorry, I encountered an error while processing your request. Please try again.",
      mrkdwn: true,
    });
  }
}
