import {
  CreateConversationParams,
  CreateConversationResult,
  CreateSessionParams,
  CreateSessionResult,
  HelperTool,
  PatchConversationParams,
  PatchConversationResult,
  UseConversationResult,
  UseConversationsResult,
} from "./types";

export class HelperClient {
  public readonly host: string;
  private sessionParams: CreateSessionParams;

  constructor({ host, ...sessionParams }: CreateSessionParams & { host: string }) {
    this.sessionParams = sessionParams;
    this.host = host;
  }

  private token: string | null = null;
  private getToken = async (): Promise<string> => {
    if (!this.token) {
      const { token } = await this.sessions.create(this.sessionParams);
      this.token = token;
    }
    return this.token;
  };

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  get email() {
    return this.sessionParams.email ?? null;
  }

  readonly sessions = {
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

  readonly conversations = {
    list: (): Promise<UseConversationsResult> => this.request<UseConversationsResult>("/api/chat/conversations"),

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

  readonly chat = {
    handler: ({ conversationSlug, tools }: { conversationSlug: string; tools: Record<string, HelperTool> }) => ({
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        const token = await this.getToken();
        return fetch(`${this.host}/api/chat`, {
          ...init,
          headers: {
            ...init?.headers,
            Authorization: `Bearer ${token}`,
          },
        });
      },
      experimental_prepareRequestBody: ({
        messages,
        id,
        requestBody,
      }: {
        messages: any[];
        id: string;
        requestBody?: object;
      }) => ({
        id,
        message: messages[messages.length - 1],
        conversationSlug,
        tools: Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          parameters: tool.parameters,
          serverRequestUrl: "url" in tool ? tool.url : undefined,
        })),
        requestBody,
      }),
      onToolCall: ({ toolCall }: { toolCall: { toolName: string; args: unknown } }) => {
        const tool = tools[toolCall.toolName];
        if (!tool) {
          throw new Error(`Tool ${toolCall.toolName} not found`);
        }
        if (!("execute" in tool)) {
          throw new Error(`Tool ${toolCall.toolName} is not executable on the client`);
        }
        return tool.execute(toolCall.args);
      },
    }),
  };
}
