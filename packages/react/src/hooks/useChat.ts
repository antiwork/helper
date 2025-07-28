"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConversationDetails, HelperTool } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export interface UseChatProps {
  conversation: ConversationDetails;
  tools?: Record<string, HelperTool>;
  onHumanReply?: (message: { id: string; content: string; role: "assistant" }) => void;
}

export const useChat = ({
  conversation,
  tools = {},
  onHumanReply,
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
  });

  const stableSetMessages = useCallback(setMessages, [setMessages]);

  useEffect(() => {
    const unlisten = client.conversations.listen(conversation.slug, {
      onHumanReply: (message: { id: string; content: string; role: "assistant" }) => {
        onHumanReply?.(message);
      },
      onTyping: (isTyping: boolean) => {
        setAgentTyping(isTyping);
      },
      onSubjectChanged: () => {},
    });

    return unlisten;
  }, [conversation, tools, client, onHumanReply]);

  return {
    messages: client.chat.messages(messages),
    setMessages: stableSetMessages,
    agentTyping,
    ...rest,
  };
};
