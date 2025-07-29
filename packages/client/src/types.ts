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
  isUnread: z.boolean(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(["user", "staff", "assistant"]),
  staffName: z.string().nullable(),
  reactionType: z.enum(["thumbs-up", "thumbs-down"]).nullable(),
  reactionFeedback: z.string().nullable(),
  reactionCreatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  publicAttachments: z.array(
    z.object({
      name: z.string().nullable(),
      contentType: z.string().nullable(),
      url: z.string(),
    }),
  ),
  privateAttachments: z.array(
    z.object({
      name: z.string().nullable(),
      contentType: z.string().nullable(),
      url: z.string(),
    }),
  ),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationDetailsSchema = z.object({
  slug: z.string(),
  subject: z.string().nullable(),
  isEscalated: z.boolean(),
  messages: z.array(messageSchema),
  experimental_guideSessions: z.array(
    z.object({
      uuid: z.string(),
      title: z.string(),
      instructions: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});
export type ConversationDetails = z.infer<typeof conversationDetailsSchema>;

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
  supabaseUrl: z.string(),
  supabaseAnonKey: z.string(),
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

export const conversationListSchema = z.object({
  conversations: z.array(conversationSchema),
  nextCursor: z.nullable(z.string()),
});
export type ConversationsResult = z.infer<typeof conversationListSchema>;

export const unreadConversationsCountSchema = z.object({
  count: z.number(),
});
export type UnreadConversationsCountResult = z.infer<typeof unreadConversationsCountSchema>;
