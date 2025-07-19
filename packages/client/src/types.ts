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

export interface Conversation {
  slug: string;
  subject: string;
  createdAt: string;
  latestMessage: string | null;
  latestMessageCreatedAt: string | null;
  messageCount: number;
}

export interface Message {
  id: string;
  content: string;
  role: "data" | "system" | "user" | "assistant";
}

export interface CreateSessionParams {
  email?: string | null;
  emailHash?: string | null;
  timestamp?: number | null;
  customerMetadata?: {
    name?: string | null;
    value?: number | null;
    links?: Record<string, string> | null;
  } | null;
  currentToken?: string | null;
}

export interface CreateSessionResult {
  token: string;
}

export interface CreateConversationParams {
  isPrompt?: boolean;
  subject?: string;
}

export interface CreateConversationResult {
  conversationSlug: string;
}

export interface PatchConversationParams {
  markRead: true;
}

export interface PatchConversationResult {
  success: true;
}

export interface UseConversationsResult {
  conversations: Conversation[];
}

export interface UseConversationResult {
  subject: string | null;
  messages: Message[];
  isEscalated: boolean;
}
