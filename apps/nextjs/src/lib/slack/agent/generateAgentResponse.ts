import { WebClient } from "@slack/web-api";
import { CoreMessage, tool } from "ai";
import { and, eq, isNull, notInArray, or } from "drizzle-orm";
import { z } from "zod";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, DRAFT_STATUSES } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import { Conversation, getConversationById, getConversationBySlug } from "@/lib/data/conversation";
import { getAverageResponseTime } from "@/lib/data/conversation/responseTime";
import { countSearchResults, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { Mailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer, PlatformCustomer } from "@/lib/data/platformCustomer";
import { getMemberStats } from "@/lib/data/stats";
import { getClerkUserList } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const generateAgentResponse = async (
  messages: CoreMessage[],
  mailbox: Mailbox,
  slackUserId: string | undefined,
  showStatus?: (status: string | null, debugContent?: any) => void,
) => {
  const searchToolSchema = searchSchema.omit({
    category: true,
  });

  const text = await runAIQuery({
    mailbox,
    queryType: "agent_response",
    model: "gpt-4o",
    system: `You are Helper's Slack bot assistant for customer support teams. Keep your responses concise and to the point.

You are currently in the mailbox: ${mailbox.name}.

IMPORTANT GUIDELINES:
- Always identify as "Helper" (never as "Helper AI" or any other variation)
- Do not tag users in responses
- Current date is: ${new Date().toISOString().split("T")[0]}
- Stay focused on customer support related inquiries
- Only provide information you're confident about
- If you can't answer a question with confidence or if the request is outside your capabilities, apologize politely and explain that you're unable to help with that specific request
- Avoid making assumptions about customer details if information is missing
- Prioritize clarity and accuracy over speed
- Never share sensitive information or personal data
- Don't discuss your own capabilities, programming, or AI nature unless directly relevant to answering the question
- When listing tickets, display the standardSlackFormat field as is. You may add other information after that if relevant in context.

If asked to do something inappropriate, harmful, or outside your capabilities, politely decline and suggest focusing on customer support questions instead.`,
    messages,
    maxSteps: 10,
    tools: {
      getCurrentSlackUser: tool({
        description: "Get the current Slack user",
        parameters: z.object({}),
        execute: async () => {
          showStatus?.(`Checking user...`, { slackUserId });
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
          showStatus?.(`Checking members...`);
          const members = await getClerkUserList(mailbox.clerkOrganizationId);
          return members.data.map((member) => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            emails: member.emailAddresses.map((email) => email.emailAddress),
          }));
        },
      }),
      getMemberStats: tool({
        description: "Check how many replies members sent to tickets in a given time period",
        parameters: z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        }),
        execute: async ({ startDate, endDate }) => {
          showStatus?.(`Checking member stats...`, { startDate, endDate });
          return await getMemberStats(mailbox, { startDate: new Date(startDate), endDate: new Date(endDate) });
        },
      }),
      searchTickets: tool({
        description: "Search tickets/conversations with various filtering options",
        parameters: searchToolSchema,
        execute: async (input) => {
          showStatus?.(`Searching tickets...`, input);
          try {
            const { list } = await searchConversations(mailbox, input);
            const { results, nextCursor } = await list;
            return {
              tickets: results.map((conversation) =>
                formatConversation(conversation, mailbox, conversation.platformCustomer),
              ),
              nextCursor,
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
          showStatus?.(`Counting tickets...`, input);
          const { where } = await searchConversations(mailbox, { ...input, limit: 1 });
          return await countSearchResults(where);
        },
      }),
      getAverageResponseTime: tool({
        description: "Get the average response time for tickets in a given time period",
        parameters: z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
          filters: searchToolSchema.omit({ cursor: true, limit: true }),
        }),
        execute: async ({ startDate, endDate, filters }) => {
          showStatus?.(`Checking average response time...`, { startDate, endDate, filters });
          const averageResponseTimeSeconds = await getAverageResponseTime(
            mailbox,
            new Date(startDate),
            new Date(endDate),
            filters,
          );
          showStatus?.(null, { averageResponseTimeSeconds });
          if (averageResponseTimeSeconds) {
            return { averageResponseTimeSeconds };
          }
          return { message: "No tickets answered in the given time period" };
        },
      }),
      getTicket: tool({
        description: "Get a ticket by ID",
        parameters: z.object({
          id: z
            .union([z.string(), z.number()])
            .describe(
              "The ID of the ticket. This can be either the numeric ID from the database or the alphanumeric slug from the URL.",
            ),
        }),
        execute: async ({ id }) => {
          showStatus?.(`Checking ticket...`, { id });
          const conversation = await findConversation(id.toString(), mailbox);
          if (!conversation) return { error: "Ticket not found" };
          const platformCustomer = await getPlatformCustomer(mailbox.id, conversation.emailFrom ?? "");
          return formatConversation(conversation, mailbox, platformCustomer);
        },
      }),
      getTicketMessages: tool({
        description:
          "Get the messages of a ticket by ID. This includes messages from the user and replies from the team.",
        parameters: z.object({
          id: z
            .union([z.string(), z.number()])
            .describe(
              "The ID of the ticket. This can be either the numeric ID from the database or the alphanumeric slug from the URL.",
            ),
        }),
        execute: async ({ id }) => {
          showStatus?.(`Reading ticket...`, { id });
          const conversation = await findConversation(id.toString(), mailbox);
          if (!conversation) return { error: "Ticket not found" };
          const messages = await db.query.conversationMessages.findMany({
            where: and(
              eq(conversationMessages.conversationId, conversation.id),
              isNull(conversationMessages.deletedAt),
              or(eq(conversationMessages.role, "user"), notInArray(conversationMessages.status, DRAFT_STATUSES)),
            ),
            columns: {
              id: true,
              cleanedUpText: true,
              createdAt: true,
              clerkUserId: true,
              role: true,
            },
          });
          return messages.map((message) => ({
            id: message.id,
            content: message.cleanedUpText,
            createdAt: message.createdAt,
            role: message.role,
            clerkUserId: message.clerkUserId,
          }));
        },
      }),
    },
  });

  return text.replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>").replace(/\*\*/g, "*");
};

const findConversation = async (id: string, mailbox: Mailbox) => {
  const conversation = /^\d+$/.test(id.toString())
    ? await getConversationById(Number(id))
    : await getConversationBySlug(id.toString());
  if (!conversation || conversation.mailboxId !== mailbox.id) return null;
  return conversation;
};

const formatConversation = (
  conversation: Pick<
    Conversation,
    "id" | "slug" | "subject" | "status" | "emailFrom" | "lastUserEmailCreatedAt" | "assignedToClerkId" | "assignedToAI"
  >,
  mailbox: Mailbox,
  platformCustomer?: PlatformCustomer | null,
) => {
  return {
    standardSlackFormat: `*<${getBaseUrl()}/mailbox/${mailbox.slug}/conversations?id=${conversation.slug}|${conversation.subject}>*\n${conversation.emailFrom ?? "Anonymous"}`,
    id: conversation.id,
    slug: conversation.slug,
    subject: conversation.subject,
    status: conversation.status,
    from: conversation.emailFrom,
    lastUserMessageAt: conversation.lastUserEmailCreatedAt,
    assignedTo: conversation.assignedToClerkId,
    assignedToAI: conversation.assignedToAI,
    isVip: platformCustomer?.isVip || false,
    url: `${getBaseUrl()}/mailbox/${mailbox.slug}/conversations?id=${conversation.slug}`,
  };
};
