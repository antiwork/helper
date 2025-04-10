import { openai } from "@ai-sdk/openai";
import { WebClient } from "@slack/web-api";
import { CoreMessage, generateText, tool } from "ai";
import { z } from "zod";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { countSearchResults, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { Mailbox } from "@/lib/data/mailbox";
import { getClerkUserList } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const generateResponse = async (
  messages: CoreMessage[],
  mailbox: Mailbox,
  slackUserId: string | undefined,
  updateStatus?: (status: string, debugContent?: string) => void,
) => {
  const searchToolSchema = searchSchema.omit({
    category: true,
  });

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a Slack bot assistant. Keep your responses concise and to the point.
    - Do not tag users.
    - Current date is: ${new Date().toISOString().split("T")[0]}`,
    messages,
    maxSteps: 10,
    tools: {
      getCurrentSlackUser: tool({
        description: "Get the current Slack user",
        parameters: z.object({}),
        execute: async () => {
          updateStatus?.(`is getting user...`, JSON.stringify({ slackUserId }, null, 2));
          if (!slackUserId) return { error: "User not found" };
          const client = new WebClient(assertDefined(mailbox.slackBotToken));
          const { user } = await client.users.info({ user: slackUserId });
          if (user) {
            return {
              id: user.id,
              name: user.profile?.real_name,
              email: user.profile?.email,
            };
          }
          return { error: "User not found" };
        },
      }),
      getMembers: tool({
        description: "Get IDs, names and emails of all team members",
        parameters: z.object({}),
        execute: async () => {
          updateStatus?.(`is getting members...`);
          const members = await getClerkUserList(mailbox.clerkOrganizationId);
          return members.data.map((member) => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            emails: member.emailAddresses.map((email) => email.emailAddress),
          }));
        },
      }),
      searchTickets: tool({
        description: "Search tickets/conversations with various filtering options",
        parameters: searchToolSchema,
        execute: async (input) => {
          updateStatus?.(`is searching tickets...`, JSON.stringify(input, null, 2));
          try {
            const { list } = await searchConversations(mailbox, input);
            return {
              tickets: list.results.map((conversation) => ({
                id: conversation.id,
                subject: conversation.subject,
                status: conversation.status,
                from: conversation.emailFrom,
                lastUpdated: conversation.lastUserEmailCreatedAt,
                assignedTo: conversation.assignedToClerkId,
                assignedToAI: conversation.assignedToAI,
                isVip: conversation.platformCustomer?.isVip || false,
                conversationUrl: `${getBaseUrl()}/mailbox/${mailbox.slug}/conversations?id=${conversation.slug}`,
              })),
              nextCursor: list.nextCursor,
            };
          } catch (error) {
            captureExceptionAndLog(error);
            return { error: "Failed to search tickets" };
          }
        },
      }),
      countTickets: tool({
        description: "Count the number of tickets matching the search criteria",
        parameters: searchToolSchema.omit({ cursor: true, limit: true }),
        execute: async (input) => {
          updateStatus?.(`is counting tickets...`, JSON.stringify(input, null, 2));
          const { where } = await searchConversations(mailbox, { ...input, limit: 1 });
          return await countSearchResults(where);
        },
      }),
    },
  });

  return text.replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>").replace(/\*\*/g, "*");
};
