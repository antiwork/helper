import { CoreMessage, Tool, tool } from "ai";
import { and, eq, inArray, isNull, notInArray, or, SQL } from "drizzle-orm";
import { z } from "zod";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, DRAFT_STATUSES } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";

import { getFullName } from "@/lib/auth/authUtils";
import { Conversation, getConversationById, getConversationBySlug, updateConversation } from "@/lib/data/conversation";
import { getAverageResponseTime } from "@/lib/data/conversation/responseTime";
import { countSearchResults, getSearchResultIds, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { createReply } from "@/lib/data/conversationMessage";
import { Mailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer, PlatformCustomer } from "@/lib/data/platformCustomer";
import { findSimilarWebsitePages } from "@/lib/data/retrieval";
import { getMemberStats } from "@/lib/data/stats";
import { findUserViaSlack } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { CLOSED_BY_AGENT_MESSAGE, MARKED_AS_SPAM_BY_AGENT_MESSAGE, REOPENED_BY_AGENT_MESSAGE } from "../constants";

const searchToolSchema = searchSchema.omit({
  category: true,
});

// Define the schema for filters separately
const searchFiltersSchema = searchToolSchema.omit({ cursor: true, limit: true });
type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

export const generateAgentResponse = async (
  messages: CoreMessage[],
  mailbox: Mailbox,
  slackUserId: string | null,
  showStatus: (status: string | null, tool?: { toolName: string; parameters: Record<string, unknown> }) => void,
  confirmedReplyText?: string | null,
) => {
  if (confirmedReplyText) {
    messages.push({
      role: "user",
      content: `Reply to the ticket with the following message, then take any other requested actions: ${confirmedReplyText}`,
    });
  }

  const searchToolSchema = searchSchema.omit({
    category: true,
  });

  const updateTickets = async (
    fields: Partial<typeof conversations.$inferInsert>,
    input: {
      ids?: (string | number)[];
      filters?: SearchFiltersInput;
    },
    message: string,
    verb: string,
  ) => {
    showStatus(`Finding tickets to ${verb}...`, { toolName: `updateTickets#search`, parameters: input });
    try {
      const { where } = input.filters
        ? await searchConversations(mailbox, { ...input.filters, limit: 1 })
        : { where: {} as Record<string, SQL> };
      if (input.ids) {
        where.updateIds = assertDefined(
          or(
            inArray(conversations.id, input.ids.filter((id) => /^\d+$/.test(id.toString())).map(Number)),
            inArray(
              conversations.slug,
              input.ids.filter((id) => !/^\d+$/.test(id.toString())).map((id) => id.toString()),
            ),
          ),
        );
      }
      if (Object.keys(where).length === 0) {
        return { message: "No search criteria provided" };
      }
      const count = await countSearchResults(where);

      if (count === 0) {
        return { message: `No tickets found matching the criteria to ${verb}` };
      } else if (count > 1000) {
        return { error: `Too many tickets (${count}) found to ${verb}. Maximum allowed is 1000.` };
      }

      const idsToUpdate = await getSearchResultIds(where);

      showStatus(`${verb.charAt(0).toUpperCase() + verb.slice(1)}ing tickets...`, {
        toolName: `updateTickets#update`,
        parameters: { idsToUpdate, fields },
      });

      for (let i = 0; i < idsToUpdate.length; i++) {
        if (i % 10 === 9) {
          showStatus(
            `${verb.charAt(0).toUpperCase() + verb.slice(1)}ing ticket ${i + 1} out of ${idsToUpdate.length}...`,
          );
        }
        await updateConversation(assertDefined(idsToUpdate[i]), {
          set: fields,
          message,
        });
      }

      return {
        message: `Successfully ${verb}ed ${idsToUpdate.length} tickets`,
        count: idsToUpdate.length,
      };
    } catch (error) {
      captureExceptionAndLog(error);
      return { error: `Failed to ${verb} tickets` };
    }
  };

  const tools: Record<string, Tool> = {
    getUsers: tool({
      description: "Get IDs, names and emails of all team members",
      parameters: z.object({}),
      execute: async () => {
        showStatus(`Checking members...`, { toolName: "getMembers", parameters: {} });
        const members = await db.query.authUsers.findMany();
        return members.map((member) => ({
          id: member.id,
          name: getFullName(member),
          email: member.email,
        }));
      },
    }),
    getUserReplyCounts: tool({
      description: "Check how many replies members sent to tickets in a given time period",
      parameters: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }),
      execute: async ({ startDate, endDate }) => {
        showStatus(`Checking member stats...`, { toolName: "getMemberStats", parameters: { startDate, endDate } });
        return await getMemberStats(mailbox, { startDate: new Date(startDate), endDate: new Date(endDate) });
      },
    }),
    searchTickets: tool({
      description:
        "Search tickets/conversations with various filtering options. Use `nextCursor` to paginate through results; if it's set then pass it as `cursor` to get the next page of results.",
      parameters: searchToolSchema,
      execute: async (input) => {
        showStatus(`Searching tickets...`, { toolName: "searchTickets", parameters: input });
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
        showStatus(`Counting tickets...`, { toolName: "countTickets", parameters: input });
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
        showStatus(`Checking average response time...`, {
          toolName: "getAverageResponseTime",
          parameters: { startDate, endDate, filters },
        });
        const averageResponseTimeSeconds = await getAverageResponseTime(
          mailbox,
          new Date(startDate),
          new Date(endDate),
          filters,
        );
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
        showStatus(`Checking ticket...`, { toolName: "getTicket", parameters: { id } });
        const conversation = await findConversation(id, mailbox);
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
        showStatus(`Reading ticket...`, { toolName: "getTicketMessages", parameters: { id } });
        const conversation = await findConversation(id, mailbox);
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
            userId: true,
            emailFrom: true,
            role: true,
          },
        });
        const members = await db.query.authUsers.findMany();
        return messages.map((message) => ({
          id: message.id,
          content: message.cleanedUpText,
          createdAt: message.createdAt,
          role: message.role,
          sentBy:
            message.role === "user"
              ? message.emailFrom
              : getFullName(members.find((member) => member.id === message.userId)!),
          userId: message.userId,
        }));
      },
    }),
    assignTickets: tool({
      description: "Assign tickets to a team member or the current user",
      parameters: z.object({
        userId: z.string(),
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async ({ userId, ...input }) => {
        showStatus(`Assigning tickets...`, { toolName: "assignTickets", parameters: { userId, ...input } });
        return await updateTickets({ assignedToId: userId }, input, "Assigned by agent", "assign");
      },
    }),
    unassignTickets: tool({
      description: "Unassign tickets from a team member or the current user",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTickets({ assignedToId: null }, input, "Unassigned by agent", "unassign");
      },
    }),
    closeTickets: tool({
      description: "Close tickets/conversations matching various filtering options",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTickets({ status: "closed" }, input, CLOSED_BY_AGENT_MESSAGE, "close");
      },
    }),
    reopenTickets: tool({
      description: "Reopen tickets/conversations matching various filtering options",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTickets({ status: "open" }, input, REOPENED_BY_AGENT_MESSAGE, "reopen");
      },
    }),
    markTicketsAsSpam: tool({
      description: "Mark tickets/conversations matching various filtering options as spam",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTickets({ status: "spam" }, input, MARKED_AS_SPAM_BY_AGENT_MESSAGE, "mark as spam");
      },
    }),
    searchWebsitePages: tool({
      description:
        "Search website pages for information when other tools cannot answer the user's question. Use this as a fallback when the question is about topics not covered by ticket management tools.",
      parameters: z.object({
        query: z.string().describe("The search query to find relevant website pages"),
      }),
      execute: async ({ query }) => {
        showStatus(`Searching website pages...`, { toolName: "searchWebsitePages", parameters: { query } });
        try {
          const websitePages = await findSimilarWebsitePages(query, mailbox);
          if (websitePages.length === 0) {
            return { message: "No relevant website pages found for this query" };
          }
          return websitePages;
        } catch (error) {
          captureExceptionAndLog(error);
          return { error: "Failed to search website pages" };
        }
      },
    }),
  };

  if (confirmedReplyText) {
    tools.sendReply = tool({
      description: "Send the confirmed reply to a ticket.",
      parameters: z.object({
        ticketId: z.union([z.string(), z.number()]),
        // We ignore this because we already have confirmedReplyText, but it helps encourage the LLM to call the tool
        replyText: z.string(),
      }),
      execute: async ({ ticketId }) => {
        showStatus(`Sending reply...`, { toolName: "sendReply", parameters: { ticketId } });
        const conversation = await findConversation(ticketId, mailbox);
        if (!conversation) return { error: "Ticket not found" };
        await createReply({
          conversationId: conversation.id,
          message: confirmedReplyText,
          user: slackUserId ? await findUserViaSlack(assertDefined(mailbox.slackBotToken), slackUserId) : null,
          close: false,
          shouldAutoAssign: false,
        });
        return { message: "Reply sent" };
      },
    });
  } else {
    tools.confirmReplyText = tool({
      description: "Confirm the message to reply to a ticket with before sending the reply",
      parameters: z.object({
        ticketId: z.union([z.string(), z.number()]),
        proposedMessage: z
          .string()
          .describe(
            "The message to reply to the user with. Don't include a greeting or signature. Set to blank if the desired reply is unclear.",
          ),
      }),
      // eslint-disable-next-line require-await
      execute: async ({ ticketId, proposedMessage }) => {
        showStatus(`Confirming reply text...`, {
          toolName: "confirmReplyText",
          parameters: { ticketId, proposedMessage },
        });
        return {
          message:
            "Confirmation needed before replying. DON'T TAKE ANY FURTHER ACTION and don't include the message text in the response.",
        };
      },
    });
  }

  const user = slackUserId ? await findUserViaSlack(assertDefined(mailbox.slackBotToken), slackUserId) : null;
  const userPrompt = user
    ? `Current user ID: ${user.id}\nCurrent user name: ${getFullName(user)}\nCurrent user email: ${user.email}`
    : "Current user is unknown. If the user requests something for themselves DO NOT check all users, tell them to update their Slack email to match their Helper email.";

  const result = await runAIQuery({
    mailbox,
    queryType: "agent_response",
    model: "gpt-4o",
    system: `You are Helper's Slack bot assistant for customer support teams. Keep your responses concise and to the point.

You are currently in the mailbox: ${mailbox.name}. You cannot access any other mailboxes; the user must start a new chat or explicitly mention another mailbox by name to access others.

${userPrompt}

IMPORTANT GUIDELINES:
- Always identify as "Helper" (never as "Helper AI" or any other variation)
- Do not tag users in responses
- Current time is: ${new Date().toISOString()}
- Stay focused on customer support related inquiries
- Only provide information you're confident about
- If you can't answer a question with confidence or if the request is outside your capabilities, apologize politely and explain that you're unable to help with that specific request
- Avoid making assumptions about customer details if information is missing
- Prioritize clarity and accuracy over speed
- Don't discuss your own capabilities, programming, or AI nature unless directly relevant to answering the question
- When listing tickets, display the standardSlackFormat field as is. You may add other information after that if relevant in context.
- If you will need to reply to a ticket as part of your response and the sendReply tool is not available, use the confirmReplyText tool and *do not do anything else* at this stage.
- *If you have the sendReply tool, call it!* Then include in your response that the reply has been sent.

CITATIONS:
- When using website content from the searchWebsitePages tool, assign each unique URL an incremental number (inside a pair of parentheses), including whitespaces around the parentheses, and add it as a hyperlink immediately after the text. Use the format \`[(n)](URL)\`.
- Example: "This information comes from our documentation [(1)](https://example.com/docs)."

If asked to do something inappropriate, harmful, or outside your capabilities, politely decline and suggest focusing on customer support questions instead.`,
    messages,
    maxSteps: 10,
    tools,
  });

  const confirmReplyText = result.steps
    ?.flatMap((step) => step.toolCalls ?? [])
    .find((call) => call.toolName === "confirmReplyText");

  return {
    text: result.text.replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>").replace(/\*\*/g, "*"),
    confirmReplyText,
  };
};

const findConversation = async (id: string | number, mailbox: Mailbox) => {
  const conversation = /^\d+$/.test(id.toString())
    ? await getConversationById(Number(id))
    : await getConversationBySlug(id.toString());
  if (!conversation || conversation.mailboxId !== mailbox.id) return null;
  return conversation;
};

const formatConversation = (
  conversation: Pick<
    Conversation,
    "id" | "slug" | "subject" | "status" | "emailFrom" | "lastUserEmailCreatedAt" | "assignedToId" | "assignedToAI"
  >,
  mailbox: Mailbox,
  platformCustomer?: PlatformCustomer | null,
) => {
  return {
    standardSlackFormat: `*<${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|${conversation.subject}>*\n${conversation.emailFrom ?? "Anonymous"}`,
    id: conversation.id,
    slug: conversation.slug,
    subject: conversation.subject,
    status: conversation.status,
    emailFrom: conversation.emailFrom,
    lastUserMessageAt: conversation.lastUserEmailCreatedAt,
    assignedToUserId: conversation.assignedToId,
    assignedToAI: conversation.assignedToAI,
    isVip: platformCustomer?.isVip || false,
    url: `${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}`,
  };
};
