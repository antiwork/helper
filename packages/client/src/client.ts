import type { SupabaseClient } from "@supabase/supabase-js";
import { listenToRealtimeEvent } from "./realtime";
import {
  ConversationDetails,
  ConversationsResult,
  CreateConversationParams,
  CreateConversationRequestBody,
  CreateConversationResult,
  CreateMessageParams,
  CreateMessageRequestBody,
  CreateMessageResult,
  CreateSessionResult,
  HelperTool,
  Message,
  ReactMessageParams,
  ReactMessageResult,
  SessionParams,
  ToolRequestBody,
  UnreadConversationsCountResult,
  UpdateConversationParams,
  UpdateConversationRequestBody,
  UpdateConversationResult,
} from "./types";

type AIMessageCompat = {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  createdAt?: Date;
  experimental_attachments?: { name?: string; contentType?: string; url: string }[];
  annotations?: any[] | undefined;
};

declare global {
  interface Window {
    HelperSupabase?: { client: SupabaseClient };
  }
}

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

  private supabaseParams: { url: string; anonKey: string } | null = null;

  private async createSession() {
    const { token, supabaseUrl, supabaseAnonKey } = await this.sessions.create(this.sessionParams);
    this.token = token;
    this.supabaseParams = { url: supabaseUrl, anonKey: supabaseAnonKey };
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    if (response.headers.get("content-type")?.includes("application/json")) {
      const errorData = await response.json();
      if (errorData && typeof errorData === "object" && "error" in errorData) {
        throw new Error(errorData.error);
      }
    }
    throw new Error(`Request failed: ${response.statusText}`);
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

    if (!response.ok) await this.handleErrorResponse(response);

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

      if (!response.ok) await this.handleErrorResponse(response);

      const data = await response.json();
      return data;
    },
  };

  readonly conversations = {
    list: (): Promise<ConversationsResult> => this.request<ConversationsResult>("/api/chat/conversations"),

    unread: (): Promise<UnreadConversationsCountResult> =>
      this.request<UnreadConversationsCountResult>("/api/chat/conversations/unread"),

    get: (slug: string, { markRead = true }: { markRead?: boolean } = {}): Promise<ConversationDetails> =>
      this.request<ConversationDetails>(`/api/chat/conversation/${slug}?markRead=${markRead}`),

    create: async ({ message, ...params }: CreateConversationParams = {}): Promise<CreateConversationResult> => {
      const conversation = await this.request<CreateConversationResult>("/api/chat/conversation", {
        method: "POST",
        body: JSON.stringify(params satisfies CreateConversationRequestBody),
      });

      if (message) {
        await this.messages.create(conversation.conversationSlug, message);
      }

      return conversation;
    },

    update: (slug: string, params: UpdateConversationParams): Promise<UpdateConversationResult> =>
      this.request<UpdateConversationResult>(`/api/chat/conversation/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(params satisfies UpdateConversationRequestBody),
      }),

    listen: (
      conversationSlug: string,
      {
        onReply,
        onTyping,
        onSubjectChanged,
      }: {
        onReply?: ({ message, aiMessage }: { message: Message; aiMessage: AIMessageCompat }) => void;
        onTyping?: (isTyping: boolean) => void;
        onSubjectChanged?: (subject: string) => void;
      },
    ) => {
      if (typeof window === "undefined") {
        throw new Error("HelperClient.conversations.listen is only available in the browser");
      }

      const startListening = (supabase: SupabaseClient) => {
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
            onReply?.({
              message: event.data,
              aiMessage: formatAIMessage(event.data),
            });
            this.conversations.update(conversationSlug, { markRead: true });
          },
        );

        const unlistenConversationSubject = listenToRealtimeEvent(
          supabase,
          `public:conversation-${conversationSlug}`,
          "conversation-subject",
          (event) => {
            onSubjectChanged?.(event.data.subject);
          },
        );

        return () => {
          unlistenAgentTyping();
          unlistenAgentReply();
          unlistenConversationSubject();
        };
      };

      const promise = new Promise<() => void>(async (resolve, reject) => {
        if (!window.HelperSupabase) {
          await this.createSession();
          const scriptElement = document.createElement("script");
          scriptElement.src = `${this.host}/widget/sdk-supabase.js`;
          scriptElement.dataset.supabaseUrl = this.supabaseParams!.url;
          scriptElement.dataset.supabaseAnonKey = this.supabaseParams!.anonKey;
          scriptElement.onload = () => {
            if (!window.HelperSupabase) {
              reject(new Error("Failed to load Supabase client"));
              return;
            }
            resolve(startListening(window.HelperSupabase.client));
          };
          scriptElement.onerror = () => {
            reject(new Error("Failed to load Supabase client"));
          };
          document.head.appendChild(scriptElement);
        }
      });

      return () => {
        promise.then((unlisten) => unlisten());
      };
    },
  };

  readonly messages = {
    create: async (conversationSlug: string, params: CreateMessageParams): Promise<CreateMessageResult> => {
      const prepareAttachment = (
        attachment: File | { name: string; base64Url: string; contentType: string },
      ): Promise<{ name: string; contentType: string; url: string }> => {
        if (attachment instanceof File) {
          return this.chat.attachment(attachment);
        }
        return Promise.resolve({
          name: attachment.name,
          url: attachment.base64Url,
          contentType: attachment.contentType ?? "application/octet-stream",
        });
      };

      return this.request<CreateMessageResult>(`/api/chat/conversation/${conversationSlug}/message`, {
        method: "POST",
        body: JSON.stringify({
          ...params,
          tools: serializeTools(params.tools ?? {}),
          attachments: await Promise.all((params.attachments ?? []).map(prepareAttachment)),
          customerSpecificTools: params.customerSpecificTools ?? false,
        } satisfies CreateMessageRequestBody),
      });
    },

    react: async (
      conversationSlug: string,
      messageId: string,
      params: ReactMessageParams,
    ): Promise<ReactMessageResult> =>
      this.request<ReactMessageResult>(`/api/chat/conversation/${conversationSlug}/message/${messageId}`, {
        method: "POST",
        body: JSON.stringify(params),
      }),
  };

  readonly chat = {
    handler: ({
      conversation,
      tools = {},
      customerSpecificTools = false,
      customerInfoUrl,
      onEscalated,
    }: {
      conversation: ConversationDetails;
      tools?: Record<string, HelperTool>;
      customerSpecificTools?: boolean;
      customerInfoUrl?: string | null;
      onEscalated?: () => void;
    }) => {
      const formattedMessages = conversation.messages.map(formatAIMessage);

      const guideMessages = conversation.experimental_guideSessions.map((session) => ({
        id: `guide_session_${session.uuid}`,
        role: "assistant" as const,
        content: "",
        parts: [
          {
            type: "tool-invocation" as const,
            toolInvocation: {
              toolName: "guide_user",
              toolCallId: `guide_session_${session.uuid}`,
              state: "call" as const,
              args: {
                pendingResume: true,
                sessionId: session.uuid,
                title: session.title,
                instructions: session.instructions,
              },
            },
          },
        ],
        createdAt: new Date(session.createdAt),
      }));

      const allMessages = [...formattedMessages, ...guideMessages].toSorted(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
      );

      return {
        maxSteps: Object.keys(tools).length ? 4 : undefined,
        initialMessages: allMessages,
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
          tools: serializeTools(tools),
          customerSpecificTools,
          customerInfoUrl,
          requestBody,
        }),
        onToolCall: ({ toolCall }: { toolCall: { toolName: string; args: unknown } }) => {
          if (toolCall.toolName === "request_human_support") {
            onEscalated?.();
            return;
          }
          const tool = tools[toolCall.toolName];
          if (tool && "execute" in tool) return tool.execute(toolCall.args);
        },
      };
    },
    message: (aiMessage: AIMessageCompat): Message => {
      const original = aiMessage.annotations?.find((annotation) => annotation.original)?.original;
      if (original) return original;

      const idFromAnnotation =
        aiMessage.annotations?.find(
          (annotation): annotation is { id: string | number } =>
            typeof annotation === "object" && annotation !== null && "id" in annotation,
        )?.id ?? null;
      const persistedId = idFromAnnotation ? `${idFromAnnotation}` : aiMessage.id;

      return {
        id: persistedId,
        role: aiMessage.role === "user" ? "user" : "assistant",
        content: aiMessage.content,
        createdAt: new Date(aiMessage.createdAt ?? Date.now()).toISOString(),
        staffName: null,
        reactionType: null,
        reactionFeedback: null,
        reactionCreatedAt: null,
        publicAttachments: (aiMessage.experimental_attachments ?? []).map((attachment) => ({
          name: attachment.name ?? null,
          contentType: attachment.contentType ?? null,
          url: attachment.url,
        })),
        privateAttachments: [],
      };
    },
    messages: (aiMessages: AIMessageCompat[]) => aiMessages.map(this.chat.message),
    attachment: async (file: File) => {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
      });
      return {
        name: file.name,
        contentType: file.type,
        url: dataUrl,
      };
    },
  };
}

const serializeTools = (tools: Record<string, HelperTool>) =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        description: tool.description,
        parameters: tool.parameters,
        serverRequestUrl:
          "url" in tool
            ? typeof window !== "undefined"
              ? new URL(tool.url, window.location.origin).toString()
              : tool.url
            : undefined,
      } satisfies ToolRequestBody,
    ]),
  );

const formatAIMessage = (message: Message): AIMessageCompat => ({
  id: message.id,
  content: message.content,
  role: message.role === "staff" || message.role === "assistant" ? ("assistant" as const) : message.role,
  createdAt: new Date(message.createdAt),
  experimental_attachments: message.publicAttachments.map((attachment) => ({
    name: attachment.name ?? undefined,
    contentType: attachment.contentType ?? undefined,
    url: attachment.url,
  })),
  annotations: [{ original: message }],
});
