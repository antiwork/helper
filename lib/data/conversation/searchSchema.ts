import { z } from "zod";
import { DEFAULT_CONVERSATIONS_PER_PAGE } from "@/components/constants";

export const searchSchema = z.object({
  cursor: z
    .string()
    .nullish()
    .describe(
      "Cursor to start paginating from. Set to null for the first page and use the nextCursor from the previous page.",
    ),
  limit: z.number().min(1).max(100).default(DEFAULT_CONVERSATIONS_PER_PAGE),
  sort: z.enum(["newest", "oldest", "highest_value"]).catch("oldest").nullish(),
  category: z.enum(["conversations", "assigned", "mine", "unassigned"]).catch("conversations").nullish(),
  search: z.string().nullish().describe("Search term to look for in tickets"),
  status: z.array(z.enum(["open", "closed", "spam"]).catch("open")).nullish(),
  assignee: z.array(z.string().uuid()).optional().describe("ID of team members currently assigned to the conversation"),
  isAssigned: z.boolean().optional().describe("Filter tickets assigned to any team member or unassigned"),
  createdAfter: z.string().datetime().optional().describe("Filter tickets created after this date"),
  createdBefore: z.string().datetime().optional().describe("Filter tickets created before this date"),
  repliedAfter: z.string().datetime().optional().describe("Filter tickets where a human has replied after this date"),
  repliedBefore: z.string().datetime().optional().describe("Filter tickets where a human has replied before this date"),
  repliedBy: z.array(z.string().uuid()).optional().describe("ID of team members who have replied to the conversation"),
  customer: z.array(z.string()).optional().describe("Email address of the customer who opened the ticket"),
  anonymousSessionId: z
    .string()
    .optional()
    .describe("Anonymous session ID for identifying anonymous user conversations"),
  isVip: z.boolean().optional().describe("Filter by VIP customers"),
  minValueDollars: z.number().optional().describe("Filter by customers with a minimum value"),
  maxValueDollars: z.number().optional().describe("Filter by customers with a maximum value"),
  isPrompt: z.boolean().optional().describe("Filter by tickets which were created from a fixed prompt"),
  reactionType: z
    .enum(["thumbs-up", "thumbs-down"])
    .optional()
    .describe("Filter by whether the user gave a positive or negative reaction to the ticket"),
  reactionAfter: z.string().datetime().optional().describe("Filter tickets with reactions created after this date"),
  reactionBefore: z.string().datetime().optional().describe("Filter tickets with reactions created before this date"),
  events: z
    .array(z.enum(["request_human_support"]))
    .optional()
    .describe("Filter tickets that were escalated to humans"),

  closed: z
    .object({
      by: z
        .enum(["human", "slack_bot"])
        .optional()
        .describe("Filter tickets closed by a human or the Helper Slack agent"),
      byUserId: z.array(z.string().uuid()).optional().describe("Filter tickets closed by specific team members"),
      before: z.string().datetime().optional().describe("Tickets closed before this date"),
      after: z.string().datetime().optional().describe("Tickets closed after this date"),
    })
    .optional()
    .describe("Filter tickets by when they were closed or who closed them"),

  reopened: z
    .object({
      by: z
        .enum(["human", "slack_bot"])
        .optional()
        .describe("Filter tickets reopened by a human or the Helper Slack agent"),
      byUserId: z.array(z.string().uuid()).optional().describe("Filter tickets reopened by specific team members"),
      before: z.string().datetime().optional().describe("Tickets reopened before this date"),
      after: z.string().datetime().optional().describe("Tickets reopened after this date"),
    })
    .optional()
    .describe("Filter tickets reopened by the Helper Slack agent or by human agents"),

  markedAsSpam: z
    .object({
      by: z
        .enum(["human", "slack_bot"])
        .optional()
        .describe("Filter tickets marked as spam by a human or the Helper Slack agent"),
      byUserId: z
        .array(z.string().uuid())
        .optional()
        .describe("Filter tickets marked as spam by specific team members"),
      before: z.string().datetime().optional().describe("Tickets marked as spam before this date"),
      after: z.string().datetime().optional().describe("Tickets marked as spam after this date"),
    })
    .optional()
    .describe("Filter tickets marked as spam by the Helper Slack agent or by human agents"),

  issueGroupId: z.number().optional().describe("Filter tickets by issue group ID"),
  hasUnreadMessages: z.boolean().optional().describe("Filter conversations with unread user messages"),
});
