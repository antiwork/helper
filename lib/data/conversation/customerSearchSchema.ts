import { z } from "zod";
import { DEFAULT_CONVERSATIONS_PER_PAGE } from "@/components/constants";

export const customerSearchSchema = z.object({
  cursor: z
    .string()
    .nullish()
    .describe(
      "Cursor to start paginating from. Set to null for the first page and use the nextCursor from the previous page.",
    ),
  limit: z.number().min(1).max(100).default(DEFAULT_CONVERSATIONS_PER_PAGE),
  search: z.string().nullish().describe("Search term to look for in conversations"),
  status: z.array(z.enum(["open", "closed", "spam"]).catch("open")).nullish(),
  createdAfter: z.string().datetime().optional().describe("Filter conversations created after this date"),
  createdBefore: z.string().datetime().optional().describe("Filter conversations created before this date"),
  isPrompt: z.boolean().optional().describe("Filter by conversations which were created from a fixed prompt"),
  reactionType: z
    .enum(["thumbs-up", "thumbs-down"])
    .optional()
    .describe("Filter by whether the user gave a positive or negative reaction"),
  reactionAfter: z
    .string()
    .datetime()
    .optional()
    .describe("Filter conversations with reactions created after this date"),
  reactionBefore: z
    .string()
    .datetime()
    .optional()
    .describe("Filter conversations with reactions created before this date"),
});
