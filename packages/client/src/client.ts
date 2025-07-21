import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { listenToRealtimeEvent } from "./realtime";
import {
  ConversationResult,
  ConversationsResult,
  CreateConversationParams,
  CreateConversationResult,
  CreateSessionResult,
  HelperTool,
  SessionParams,
  UpdateConversationParams,
  UpdateConversationResult,
} from "./types";

export class HelperClient {
  public readonly host: string;
  private sessionParams: SessionParams;

  constructor({ host, ...sessionParams }: SessionParams & { host: string }) {
    this.sessionParams = sessionParams;
    this.host = host;
  }

  private token: string | null = null;
  private getToken = async (): Promise<string> => {
    if (!this.token) await this.createSession();
    return this.token!;
  };

  private supabase: SupabaseClient | null = null;
  private getSupabase = async (): Promise<SupabaseClient> => {
    if (!this.supabase) await this.createSession();
    return this.supabase!;
  };

  private async createSession() {
    const { token, supabaseUrl, supabaseAnonKey } = await this.sessions.create(this.sessionParams);
    this.token = token;
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

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
    create: async (params: SessionParams): Promise<CreateSessionResult> => {
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
    list: (): Promise<ConversationsResult> => this.request<ConversationsResult>("/api/chat/conversations"),

    get: (slug: string, { markRead = true }: { markRead?: boolean } = {}): Promise<ConversationResult> =>
      this.request<ConversationResult>(`/api/chat/conversation/${slug}?markRead=${markRead}`),

    create: (params: CreateConversationParams = {}): Promise<CreateConversationResult> =>
      this.request<CreateConversationResult>("/api/chat/conversation", {
        method: "POST",
        body: JSON.stringify(params),
      }),

    update: (slug: string, params: UpdateConversationParams): Promise<UpdateConversationResult> =>
      this.request<UpdateConversationResult>(`/api/chat/conversation/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(params),
      }),
  };

  readonly chat = {
    handler: ({
      conversation,
      tools = {},
    }: {
      conversation: ConversationResult;
      tools?: Record<string, HelperTool>;
    }) => ({
      initialMessages: conversation.messages,
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
        conversationSlug: conversation.slug,
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
    listen: (
      conversationSlug: string,
      {
        onHumanReply,
        onTyping,
      }: {
        onHumanReply?: (message: { id: string; content: string; role: "assistant" }) => void;
        onTyping?: (isTyping: boolean) => void;
      },
    ) => {
      const promise = this.getSupabase().then((supabase) => {
        let agentTypingTimeout: NodeJS.Timeout | null = null;

        const unlistenAgentTyping = listenToRealtimeEvent(
          supabase,
          `public:conversation-${conversationSlug}`,
          "agent-typing",
          () => {
            onTyping?.(true);
            if (agentTypingTimeout) clearTimeout(agentTypingTimeout);
            agentTypingTimeout = setTimeout(() => onTyping?.(false), 10000);
          },
        );

        const unlistenAgentReply = listenToRealtimeEvent(
          supabase,
          `public:conversation-${conversationSlug}`,
          "agent-reply",
          (event) => {
            onTyping?.(false);
            onHumanReply?.({
              id: `staff_${Date.now()}`,
              content: event.data.message,
              role: "assistant",
            });
            this.conversations.update(conversationSlug, { markRead: true });
          },
        );

        return () => {
          unlistenAgentTyping();
          unlistenAgentReply();
        };
      });

      return () => {
        promise.then((unlisten) => unlisten());
      };
    },
  };
}
