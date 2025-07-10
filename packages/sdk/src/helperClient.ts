import {
  CreateConversationParams,
  CreateConversationResponse,
  CreateMessageParams,
  CreateMessageResponse,
  GetConversationResponse,
  ListConversationsResponse,
} from "./apiTypes";

export const createHelperClient = ({ host, token }: { host: string; token?: string | null }) => {
  const request = async <ResponseType>(path: string, options?: RequestInit) => {
    const response = await fetch(`${host}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    return response.json() as Promise<ResponseType>;
  };

  return {
    conversations: {
      unreadCount: () => null,

      create: (params: CreateConversationParams = {}) =>
        request<CreateConversationResponse>("/api/chat/conversation", {
          method: "POST",
          body: JSON.stringify(params),
        }),

      list: () => request<ListConversationsResponse>("/api/chat/conversations"),

      get: (conversationSlug: string) => request<GetConversationResponse>(`/api/chat/conversation/${conversationSlug}`),
    },
    messages: {
      create: (conversationSlug: string, params: CreateMessageParams) =>
        request<CreateMessageResponse>(`/api/chat/conversation/${conversationSlug}/message`, {
          method: "POST",
          body: JSON.stringify(params),
        }),
    },
    useChat: () => null,
  };
};
