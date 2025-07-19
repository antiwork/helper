"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect } from "react";
import { HelperTool } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";
import { Conversation, useConversation } from "./useConversation";

export const useChat = (
  conversationSlug: string,
  options?: {
    tools?: Record<string, HelperTool>;
    aiChat?: Partial<Omit<Parameters<typeof useAIChat>[0], "onToolCall" | "experimental_prepareRequestBody" | "fetch">>;
  },
): ReturnType<typeof useAIChat> & { conversation: Conversation | null } => {
  const { client } = useHelperContext();

  const aiChat = useAIChat({
    ...client.chat.handler({ conversationSlug, tools: options?.tools ?? {} }),
    maxSteps: 3,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
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
