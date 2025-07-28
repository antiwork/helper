"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { useHelperClient } from "../components/helperClientProvider";
import type { ConversationDetails, HelperTool } from "@helperai/client";

export interface UseChatProps {
  conversation: ConversationDetails;
  tools?: Record<string, HelperTool>;
}

export const useChat = ({ conversation, tools = {} }: UseChatProps): {
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
  
  const chatHandler = client.chat.handler({ conversation, tools });
  
  const { messages, setMessages, ...rest } = useAIChat({
    ...chatHandler,
  });
  
  useEffect(() => {
    const unlisten = client.conversations.listen(conversation.slug, {
      onHumanReply: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onTyping: (isTyping) => {
        setAgentTyping(isTyping);
      },
      onSubjectChanged: () => {
      },
    });
    
    return unlisten;
  }, [conversation.slug, client, setMessages]);
  
  return {
    messages: client.chat.messages(messages),
    setMessages,
    agentTyping,
    ...rest,
  };
};
