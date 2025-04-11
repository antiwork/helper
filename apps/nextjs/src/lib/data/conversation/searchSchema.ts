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
  assignee: z.array(z.string()).optional().describe("ID of team members currently assigned to the conversation"),
  isAssigned: z.boolean().optional().describe("Filter tickets assigned to any team member or unassigned"),
  createdAfter: z.string().datetime().optional().describe("Filter tickets created after this date"),
  createdBefore: z.string().datetime().optional().describe("Filter tickets created before this date"),
  repliedAfter: z.string().datetime().optional().describe("Filter tickets where a human has replied after this date"),
  repliedBefore: z.string().datetime().optional().describe("Filter tickets where a human has replied before this date"),
  repliedBy: z.array(z.string()).optional().describe("ID of team members who have replied to the conversation"),
  customer: z.array(z.string()).optional().describe("Email address of the customer who opened the ticket"),
  isVip: z.boolean().optional().describe("Filter by VIP customers"),
  minValueDollars: z.number().optional().describe("Filter by customers with a minimum value"),
  maxValueDollars: z.number().optional().describe("Filter by customers with a maximum value"),
  isPrompt: z.boolean().optional().describe("Filter by tickets which were created from a fixed prompt"),
  reactionType: z
    .enum(["thumbs-up", "thumbs-down"])
    .optional()
    .describe("Filter by whether the user gave a positive or negative reaction to the ticket"),
  events: z
    .array(z.enum(["request_human_support", "resolved_by_ai"]))
    .optional()
    .describe("Filter tickets that were escalated to humans or resolved by AI"),
});
