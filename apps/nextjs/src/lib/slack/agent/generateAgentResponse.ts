import { WebClient } from "@slack/web-api";
import { CoreMessage, Tool, tool } from "ai";
import { and, eq, inArray, isNull, ne, notInArray, or, SQL } from "drizzle-orm";
import { z } from "zod";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, DRAFT_STATUSES } from "@/db/schema";
import { runAIRawQuery } from "@/lib/ai";
import { Conversation, getConversationById, getConversationBySlug, updateConversation } from "@/lib/data/conversation";
import { getAverageResponseTime } from "@/lib/data/conversation/responseTime";
import { countSearchResults, getSearchResultIds, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { createReply } from "@/lib/data/conversationMessage";
import { Mailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer, PlatformCustomer } from "@/lib/data/platformCustomer";
import { getMemberStats } from "@/lib/data/stats";
import { findUserViaSlack, getClerkUserList } from "@/lib/data/user";
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
  slackUserId: string | undefined,
  showStatus: (status: string | null, tool?: { toolName: string; parameters: Record<string, unknown> }) => void,
  confirmedReplyText?: string | null,
) => {
  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const searchToolSchema = searchSchema.omit({
    category: true,
  });

  const tools: Record<string, Tool> = {
    getCurrentSlackUser: tool({
      description: "Get the current Slack user",
      parameters: z.object({}),
      execute: async () => {
        showStatus(`Checking user...`, { toolName: "getCurrentSlackUser", parameters: { slackUserId } });
        if (!slackUserId) return { error: "User not found" };
        const { user } = await client.users.info({ user: slackUserId });
        const members = await getClerkUserList(mailbox.clerkOrganizationId);
        if (user) {
          return {
            id: user.id,
            clerkUserId: members.data.find((member) => {
              const slackAccount = member.externalAccounts.find((account) => account.provider === "oauth_slack");
              return (
                slackAccount?.externalId === slackUserId ||
                member.emailAddresses.some((email) => email.emailAddress === user.profile?.email)
              );
            })?.id,
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
        showStatus(`Checking members...`, { toolName: "getMembers", parameters: {} });
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
        showStatus(`Checking member stats...`, { toolName: "getMemberStats", parameters: { startDate, endDate } });
        return await getMemberStats(mailbox, { startDate: new Date(startDate), endDate: new Date(endDate) });
      },
    }),
    searchTickets: tool({
      description: "Search tickets/conversations with various filtering options",
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
    assignTickets: tool({
      description: "Assign tickets to a team member or the current user",
      parameters: z.object({
        clerkUserId: z.string().regex(/^user_(\w+)$/),
        ticketIds: z.array(z.union([z.string(), z.number()])),
      }),
      execute: async ({ clerkUserId, ticketIds }) => {
        showStatus(`Assigning tickets...`, { toolName: "assignTickets", parameters: { clerkUserId, ticketIds } });
        const conversations = await Promise.all(
          ticketIds.map(async (ticketId) => {
            const conversation = await findConversation(ticketId, mailbox);
            if (!conversation) return null;
            return await updateConversation(conversation.id, {
              set: { assignedToClerkId: clerkUserId },
              message: "Assigned by agent",
            });
          }),
        );
        return conversations.flatMap((conversation) => (conversation ? formatConversation(conversation, mailbox) : []));
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
    closeTickets: tool({
      description: "Close tickets/conversations matching various filtering options",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTicketsStatus(mailbox, "closed", input, CLOSED_BY_AGENT_MESSAGE, showStatus);
      },
    }),
    reopenTickets: tool({
      description: "Reopen tickets/conversations matching various filtering options",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTicketsStatus(mailbox, "open", input, REOPENED_BY_AGENT_MESSAGE, showStatus);
      },
    }),
    markTicketsAsSpam: tool({
      description: "Mark tickets/conversations matching various filtering options as spam",
      parameters: z.object({
        ids: z.array(z.union([z.string(), z.number()])).optional(),
        filters: searchToolSchema.omit({ cursor: true, limit: true }).optional(),
      }),
      execute: async (input) => {
        return await updateTicketsStatus(mailbox, "spam", input, MARKED_AS_SPAM_BY_AGENT_MESSAGE, showStatus);
      },
    }),
  };

  if (confirmedReplyText) {
    tools.sendReply = tool({
      description: "Send the confirmed reply to a ticket",
      parameters: z.object({
        ticketId: z.union([z.string(), z.number()]),
      }),
      execute: async ({ ticketId }) => {
        const conversation = await findConversation(ticketId, mailbox);
        if (!conversation) return { error: "Ticket not found" };
        await createReply({
          conversationId: conversation.id,
          message: confirmedReplyText,
          user: slackUserId
            ? await findUserViaSlack(mailbox.clerkOrganizationId, assertDefined(mailbox.slackBotToken), slackUserId)
            : null,
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
          .describe("The message to reply to the user with. Set to blank if the desired reply is unclear."),
      }),
      // eslint-disable-next-line require-await
      execute: async ({ ticketId, proposedMessage }) => {
        showStatus(`Confirming reply text...`, {
          toolName: "confirmReplyText",
          parameters: { ticketId, proposedMessage },
        });
        return { message: "Confirmation needed before replying. DON'T TAKE ANY FURTHER ACTION." };
      },
    });
  }

  const result = await runAIRawQuery({
    mailbox,
    queryType: "agent_response",
    model: "gpt-4o",
    system: `You are Helper's Slack bot assistant for customer support teams. Keep your responses concise and to the point.

You are currently in the mailbox: ${mailbox.name}.

IMPORTANT GUIDELINES:
- Always identify as "Helper" (never as "Helper AI" or any other variation)
- Do not tag users in responses
- Current time is: ${new Date().toISOString()}
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
    "id" | "slug" | "subject" | "status" | "emailFrom" | "lastUserEmailCreatedAt" | "assignedToClerkId" | "assignedToAI"
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
    from: conversation.emailFrom,
    lastUserMessageAt: conversation.lastUserEmailCreatedAt,
    assignedTo: conversation.assignedToClerkId,
    assignedToAI: conversation.assignedToAI,
    isVip: platformCustomer?.isVip || false,
    url: `${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}`,
  };
};

const updateTicketsStatus = async (
  mailbox: Mailbox,
  status: "open" | "closed" | "spam",
  input: {
    ids?: (string | number)[];
    filters?: SearchFiltersInput;
  },
  message: string,
  showStatus: (status: string | null, tool?: { toolName: string; parameters: Record<string, unknown> }) => void,
) => {
  showStatus(`Finding tickets to mark ${status}...`, { toolName: `${status}Tickets#search`, parameters: input });
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
    where.statusCheck = ne(conversations.status, status);
    const count = await countSearchResults(where);

    if (count === 0) {
      return { message: `No tickets found matching the criteria to mark ${status}` };
    } else if (count > 1000) {
      return { error: `Too many tickets (${count}) found to mark ${status}. Maximum allowed is 1000.` };
    }

    const idsToUpdate = await getSearchResultIds(where);

    showStatus(`Marking tickets as ${status}...`, {
      toolName: `${status}Tickets#update`,
      parameters: { idsToUpdate },
    });

    for (let i = 0; i < idsToUpdate.length; i++) {
      if (i % 10 === 9) {
        showStatus(`Marking ticket ${i + 1} out of ${idsToUpdate.length} as ${status}...`);
      }
      await updateConversation(assertDefined(idsToUpdate[i]), {
        set: { status },
        message,
      });
    }

    return {
      message: `Successfully marked ${idsToUpdate.length} tickets as ${status}`,
      count: idsToUpdate.length,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    return { error: `Failed to mark tickets as ${status}` };
  }
};
