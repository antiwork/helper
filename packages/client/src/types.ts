import { z } from "zod";

type HelperToolBase = {
  description?: string;
  parameters: Record<string, { type: "string" | "number"; description?: string; optional?: boolean }>;
};

export type HelperClientTool<Args = any, Result = any> = HelperToolBase & {
  execute: (params: Args) => Promise<Result> | Result;
};

export type HelperServerTool = HelperToolBase & {
  url: string;
};

export type HelperTool<Args = any, Result = any> = HelperClientTool<Args, Result> | HelperServerTool;

export const toolBodySchema = z.object({
  description: z.string().nullish(),
  parameters: z.record(
    z.string(),
    z.object({
      type: z.enum(["string", "number"]),
      description: z.string().nullish(),
      optional: z.boolean().nullish(),
    }),
  ),
  serverRequestUrl: z.string().nullish(),
});
export type ToolRequestBody = z.infer<typeof toolBodySchema>;

export const createMessageBodySchema = z.object({
  content: z.string(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        contentType: z.string(),
      }),
    )
    .optional(),
  tools: z.record(z.string(), toolBodySchema).optional(),
  customerSpecificTools: z.boolean().optional(),
  customerInfoUrl: z.string().nullish(),
  customerSpecificInfoUrl: z.boolean().optional(),
});
export type CreateMessageRequestBody = z.infer<typeof createMessageBodySchema>;
export type CreateMessageParams = Omit<CreateMessageRequestBody, "attachments" | "tools"> & {
  attachments?: (File | { name: string; base64Url: string; contentType: string })[];
  tools?: Record<string, HelperServerTool>;
};

export type CreateMessageResult = {
  messageId: string;
  conversationSlug: string;
};

export const reactMessageBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("thumbs-up"),
  }),
  z.object({
    type: z.literal("thumbs-down"),
    feedback: z.string().nullish(),
  }),
]);
export type ReactMessageParams = z.infer<typeof reactMessageBodySchema>;
export type ReactMessageResult = {
  reaction: ReactMessageParams;
};

export const conversationSchema = z.object({
  slug: z.string(),
  subject: z.string(),
  createdAt: z.string(),
  latestMessage: z.string().nullable(),
  latestMessageAt: z.string().datetime().nullable(),
  messageCount: z.number(),
  isEscalated: z.boolean(),
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
  currentToken: z.string().nullish(),
});
export type SessionParams = z.infer<typeof sessionParamsSchema>;

export type CreateSessionResult = {
  token: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const createConversationBodySchema = z.object({
  isPrompt: z.boolean().nullish(),
  subject: z.string().nullish(),
});
export type CreateConversationRequestBody = z.infer<typeof createConversationBodySchema>;
export type CreateConversationParams = CreateConversationRequestBody & {
  message?: CreateMessageParams;
};

export type CreateConversationResult = {
  conversationSlug: string;
};

export const updateConversationBodySchema = z.object({
  markRead: z.literal(true),
});
export type UpdateConversationRequestBody = z.infer<typeof updateConversationBodySchema>;
export type UpdateConversationParams = UpdateConversationRequestBody;

export type UpdateConversationResult = {
  success: true;
};

export type ConversationsResult = {
  conversations: Conversation[];
  nextCursor: string | null;
};

export type UnreadConversationsCountResult = {
  count: number;
};
