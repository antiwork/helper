"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationDetails, HelperTool } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export interface UseChatProps {
  conversation: ConversationDetails;
  tools?: Record<string, HelperTool>;
  enableRealtime?: boolean;
  ai?: Parameters<typeof useAIChat>[0];
}

export const useChat = ({
  conversation,
  tools = {},
  enableRealtime = true,
  ai: aiOptions,
}: UseChatProps): {
  messages: any[];
  setMessages: (messages: any[]) => void;
  agentTyping: boolean;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const client = useHelperClient();
  const [agentTyping, setAgentTyping] = useState(false);

  const chatHandler = useMemo(() => client.chat.handler({ conversation, tools }), [client, conversation, tools]);

  const { messages, setMessages, ...rest } = useAIChat({
    ...chatHandler,
    ...aiOptions,
  });

  useEffect(() => {
    if (enableRealtime === false) return;

    const unlisten = client.conversations.listen(conversation.slug, {
      onHumanReply: (message: { id: string; content: string; role: "assistant" }) => {
        setMessages((prev) => [...prev, message]);
      },
      onTyping: (isTyping: boolean) => {
        setAgentTyping(isTyping);
      },
    });

    return unlisten;
  }, [conversation, client, setMessages]);

  return {
    messages: client.chat.messages(messages),
    setMessages,
    agentTyping,
    ...rest,
  };
};
