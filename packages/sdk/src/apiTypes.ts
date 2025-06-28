import { z } from "zod";

export const createConversationParams = z.object({
  isPrompt: z.boolean().optional(),
});

export type CreateConversationParams = z.infer<typeof createConversationParams>;

export const createConversationResponse = z.object({
  conversationSlug: z.string(),
});

export type CreateConversationResponse = z.infer<typeof createConversationResponse>;
