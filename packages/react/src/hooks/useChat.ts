"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect } from "react";
import { HelperTool } from "../components/HelperProvider";
import { useHelperContext } from "../context/HelperContext";
import { Conversation, useConversation } from "./useConversation";

export const useChat = (
  conversationSlug: string,
  options?: {
    tools?: Record<string, HelperTool>;
    aiChat?: Partial<Omit<Parameters<typeof useAIChat>[0], "onToolCall" | "experimental_prepareRequestBody" | "fetch">>;
  },
): ReturnType<typeof useAIChat> & { conversation: Conversation | null } => {
  const { getToken } = useHelperContext();

  const aiChat = useAIChat({
    maxSteps: 3,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    fetch: async (url, options) => {
      const token = await getToken();
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onToolCall({ toolCall }) {
      const tool = options?.tools?.[toolCall.toolName];
      if (!tool || !("execute" in tool)) {
        throw new Error(`Tool ${toolCall.toolName} not found or not executable on the client`);
      }
      return tool.execute(toolCall.args as Record<string, unknown>);
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        message: messages[messages.length - 1],
        conversationSlug,
        tools: Object.entries(options?.tools ?? {}).map(([name, tool]) => ({
          name,
          description: tool.description,
          parameters: tool.parameters,
          serverRequestUrl: "url" in tool ? tool.url : undefined,
        })),
        ...requestBody,
      };
    },
    onError: (error) => {
      console.error(error);
      aiChat.setMessages((messages) => [
        ...messages,
        {
          id: `error_${Date.now()}`,
          role: "system",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ]);
    },
    ...options?.aiChat,
  });

  const { conversation } = useConversation(conversationSlug);

  useEffect(() => {
    if (conversation) {
      aiChat.setMessages(conversation.messages);
    }
  }, [conversation]);

  return {
    ...aiChat,
    conversation,
  };
};
