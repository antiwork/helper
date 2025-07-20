"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useCallback, useEffect, useState } from "react";
import { ConversationResult, HelperTool } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

export const useChat = (
  conversationSlug: string,
  options?: {
    tools?: Record<string, HelperTool>;
    aiChat?: Partial<Omit<Parameters<typeof useAIChat>[0], "onToolCall" | "experimental_prepareRequestBody" | "fetch">>;
  },
): ReturnType<typeof useAIChat> & { conversation: ConversationResult | null } => {
  const { client } = useHelperContext();
  const [conversation, setConversation] = useState<ConversationResult | null>(null);

  const fetchConversation = useCallback(async () => {
    try {
      const data = await client.conversations.get(conversationSlug);
      setConversation(data);
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
      setConversation(null);
    }
  }, [client, conversationSlug]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

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

  useEffect(() => {
    if (conversation) {
      aiChat.setMessages(conversation.messages);
    }
  }, [conversation, aiChat]);

  return {
    ...aiChat,
    conversation,
  };
};
