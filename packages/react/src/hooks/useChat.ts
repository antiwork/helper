"use client";

import { Message, useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { HelperTool } from "../components/HelperProvider";
import { useHelperContext } from "../context/HelperContext";

export const useChat = (
  conversationSlug: string,
  options?: {
    tools?: Record<string, HelperTool>;
    aiChat?: Partial<Omit<Parameters<typeof useAIChat>[0], "onToolCall" | "experimental_prepareRequestBody" | "fetch">>;
  },
): {
  messages: Message[];
  send: (message: string) => void;
  aiChat: ReturnType<typeof useAIChat>;
} => {
  const { getToken } = useHelperContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Wait a tick before submitting so that the input state is updated
  useEffect(() => {
    if (isSubmitting) {
      setIsSubmitting(false);
      aiChat.handleSubmit();
    }
  }, [isSubmitting]);

  return {
    messages: aiChat.messages,
    send: (message: string) => {
      aiChat.setInput(message);
      setIsSubmitting(true);
    },
    aiChat,
  };
};
