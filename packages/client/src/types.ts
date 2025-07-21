import { z } from "zod";

export type HelperTool<Args = any, Result = any> = {
  description?: string;
  parameters: Record<string, { type: "string" | "number"; description?: string; optional?: boolean }>;
} & (
  | {
      execute: (params: Args) => Promise<Result> | Result;
    }
  | {
      url: string;
    }
);

export const conversationSchema = z.object({
  slug: z.string(),
  subject: z.string(),
  createdAt: z.string(),
  latestMessage: z.string().nullable(),
  latestMessageAt: z.string().datetime().nullable(),
  messageCount: z.number(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(["data", "system", "user", "assistant"]),
});
export type Message = z.infer<typeof messageSchema>;

export const sessionParamsSchema = z.object({
  email: z.string().nullish(),
  emailHash: z.string().nullish(),
  timestamp: z.number().nullish(),
  customerMetadata: z
    .object({
      name: z.string().nullish(),
      value: z.number().nullish(),
      links: z.record(z.string(), z.string()).nullish(),
    })
    .nullish(),
  currentToken: z.string().nullish(),
});
export type SessionParams = z.infer<typeof sessionParamsSchema>;

export const createSessionResultSchema = z.object({
  token: z.string(),
});
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;

export const createConversationParamsSchema = z.object({
  isPrompt: z.boolean().nullish(),
  subject: z.string().nullish(),
});
export type CreateConversationParams = z.infer<typeof createConversationParamsSchema>;

export const createConversationResultSchema = z.object({
  conversationSlug: z.string(),
});
export type CreateConversationResult = z.infer<typeof createConversationResultSchema>;

export const updateConversationParamsSchema = z.object({
  markRead: z.literal(true),
});
export type UpdateConversationParams = z.infer<typeof updateConversationParamsSchema>;

export const updateConversationResultSchema = z.object({
  success: z.literal(true),
});
export type UpdateConversationResult = z.infer<typeof updateConversationResultSchema>;

export const conversationsResultSchema = z.object({
  conversations: z.array(conversationSchema),
  nextCursor: z.nullable(z.string()),
});
export type ConversationsResult = z.infer<typeof conversationsResultSchema>;

export const conversationResultSchema = z.object({
  subject: z.string().nullable(),
  messages: z.array(messageSchema),
  allAttachments: z.array(
    z.object({
      messageId: z.string(),
      name: z.string(),
      presignedUrl: z.string().nullable(),
    }),
  ),
  isEscalated: z.boolean(),
});
export type ConversationResult = z.infer<typeof conversationResultSchema>;
