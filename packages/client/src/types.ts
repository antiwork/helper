import * as z from "zod/mini";

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
  latestMessage: z.nullable(z.string()),
  latestMessageAt: z.nullable(z.iso.datetime()),
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
  email: z.nullish(z.string()),
  emailHash: z.nullish(z.string()),
  timestamp: z.nullish(z.number()),
  customerMetadata: z.nullish(
    z.object({
      name: z.nullish(z.string()),
      value: z.nullish(z.number()),
      links: z.nullish(z.record(z.string(), z.string())),
    }),
  ),
  currentToken: z.nullish(z.string()),
});
export type SessionParams = z.infer<typeof sessionParamsSchema>;

export const createSessionResultSchema = z.object({
  token: z.string(),
});
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;

export const createConversationParamsSchema = z.object({
  isPrompt: z.nullish(z.boolean()),
  subject: z.nullish(z.string()),
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
  subject: z.nullable(z.string()),
  messages: z.array(messageSchema),
  allAttachments: z.array(
    z.object({
      messageId: z.string(),
      name: z.string(),
      presignedUrl: z.nullable(z.string()),
    }),
  ),
  isEscalated: z.boolean(),
});
export type ConversationResult = z.infer<typeof conversationResultSchema>;
