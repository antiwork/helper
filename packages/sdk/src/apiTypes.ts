import { z } from "zod";

export const createConversationParams = z.object({
  isPrompt: z.boolean().optional(),
});

export type CreateConversationParams = z.infer<typeof createConversationParams>;

export const createConversationResponse = z.object({
  conversationSlug: z.string(),
});

export type CreateConversationResponse = z.infer<typeof createConversationResponse>;

export const listConversationsResponse = z.object({
  conversations: z.array(
    z.object({
      slug: z.string(),
      subject: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export type ListConversationsResponse = z.infer<typeof listConversationsResponse>;

export const getConversationResponse = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      role: z.string(),
    }),
  ),
});

export type GetConversationResponse = z.infer<typeof getConversationResponse>;

export const createMessageParams = z.object({
  message: z.string().min(1),
});

export type CreateMessageParams = z.infer<typeof createMessageParams>;

export const createMessageResponse = z.object({
  success: z.boolean(),
});

export type CreateMessageResponse = z.infer<typeof createMessageResponse>;
