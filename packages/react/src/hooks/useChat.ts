"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationDetails, HelperTool, Message } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export interface UseChatProps {
  conversation: ConversationDetails;
  tools?: Record<string, HelperTool>;
  enableRealtime?: boolean;
  ai?: Parameters<typeof useAIChat>[0];
}

type UseChatResult = Omit<ReturnType<typeof useAIChat>, "messages"> & {
  messages: Message[];
  rawMessages: ReturnType<typeof useAIChat>["messages"];
  agentTyping: boolean;
};

export const useChat = ({
  conversation,
  tools = {},
  enableRealtime = true,
  ai: aiOptions,
}: UseChatProps): UseChatResult => {
  const { client } = useHelperClient();
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
  }, [enableRealtime, conversation, client, setMessages]);

  return {
    messages: client.chat.messages(messages),
    rawMessages: messages,
    setMessages,
    agentTyping,
    ...rest,
  };
};
