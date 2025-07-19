import {
  CreateSessionParams,
  CreateSessionResult,
  CreateConversationParams,
  CreateConversationResult,
  PatchConversationParams,
  PatchConversationResult,
  UseConversationsResult,
  UseConversationResult,
} from "./types";

export class HelperClient {
  constructor(
    private host: string,
    private getToken: () => Promise<string>
  ) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.host}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  sessions = {
    create: async (params: CreateSessionParams): Promise<CreateSessionResult> => {
      const response = await fetch(`${this.host}/api/widget/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    },
  };

  conversations = {
    list: (): Promise<UseConversationsResult> =>
      this.request<UseConversationsResult>("/api/chat/conversations"),

    get: (slug: string): Promise<UseConversationResult> =>
      this.request<UseConversationResult>(`/api/chat/conversation/${slug}`),

    create: (params: CreateConversationParams = {}): Promise<CreateConversationResult> =>
      this.request<CreateConversationResult>("/api/chat/conversation", {
        method: "POST",
        body: JSON.stringify(params),
      }),

    update: (slug: string, params: PatchConversationParams): Promise<PatchConversationResult> =>
      this.request<PatchConversationResult>(`/api/chat/conversation/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(params),
      }),
  };
}
