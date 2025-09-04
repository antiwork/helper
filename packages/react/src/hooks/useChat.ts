"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationDetails, ConversationsResult, HelperClient, HelperTool, Message } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";
import { useRefToLatest } from "./useRefToLatest";

export interface UseChatProps {
  conversation: ConversationDetails;
  tools?: Record<string, HelperTool>;
  customerInfoUrl?: string | null;
  enableRealtime?: boolean;
  ai?: Parameters<typeof useAIChat>[0];
  customerSpecificTools?: boolean;
}

type UseChatResult = Omit<ReturnType<typeof useAIChat>, "messages"> & {
  messages: Message[];
  rawMessages: ReturnType<typeof useAIChat>["messages"];
  agentTyping: boolean;
};

export const useChat = ({
  conversation,
  tools = {},
  customerInfoUrl,
  enableRealtime = true,
  ai: aiOptions,
  customerSpecificTools = false,
}: UseChatProps): UseChatResult => {
  const { client } = useHelperClient();
  const [agentTyping, setAgentTyping] = useState(false);
  const { queryClient } = useHelperClient();

  const chatHandler = useMemo(
    () =>
      client.chat.handler({
        conversation,
        tools,
        customerSpecificTools,
        customerInfoUrl,
        onEscalated: () => {
          queryClient.setQueryData(["conversation", conversation.slug], (old: ConversationDetails | undefined) =>
            old ? { ...old, isEscalated: true } : old,
          );
          queryClient.setQueryData(["conversations"], (old: ConversationsResult | undefined) =>
            old
              ? {
                  ...old,
                  conversations: old.conversations.map((conv) =>
                    conv.slug === conversation.slug ? { ...conv, isEscalated: true } : conv,
                  ),
                }
              : old,
          );
        },
      }),
    [client, conversation, tools, customerSpecificTools],
  );

  const { messages, setMessages, ...rest } = useAIChat({
    ...chatHandler,
    ...aiOptions,
  });

  useEffect(() => {
    if (enableRealtime === false) return;

    const unlisten = client.conversations.listen(conversation.slug, {
      onReply: ({ message, aiMessage }) => {
        if (message.role === "assistant") return;
        setMessages((prev) => [...prev, aiMessage]);
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

export const useRealtimeEvents = (
  conversationSlug: string,
  {
    enabled = true,
    updateQueries = true,
    onTyping,
    onReply,
    onSubjectChanged,
  }: { enabled?: boolean; updateQueries?: boolean } & Parameters<
    InstanceType<typeof HelperClient>["conversations"]["listen"]
  >[1] = {},
) => {
  const { client, queryClient } = useHelperClient();
  const onTypingRef = useRefToLatest(onTyping);
  const onReplyRef = useRefToLatest(onReply);
  const onSubjectChangedRef = useRefToLatest(onSubjectChanged);
  const updateQueriesRef = useRefToLatest(updateQueries);

  useEffect(() => {
    if (!enabled) return;

    const unlisten = client.conversations.listen(conversationSlug, {
      onTyping: (isTyping) => {
        onTypingRef.current?.(isTyping);
      },
      onReply: (params) => {
        onReplyRef.current?.(params);
        if (updateQueriesRef.current) {
          queryClient.setQueryData(["conversation", conversationSlug], (old: ConversationDetails | undefined) =>
            old
              ? {
                  ...old,
                  messages: [...old.messages, params.message],
                }
              : old,
          );
        }
      },
      onSubjectChanged: (subject) => {
        onSubjectChangedRef.current?.(subject);
        if (updateQueriesRef.current) {
          queryClient.setQueryData(["conversation", conversationSlug], (old: ConversationDetails | undefined) =>
            old
              ? {
                  ...old,
                  subject,
                }
              : old,
          );
        }
      },
    });

    return unlisten;
  }, [conversationSlug, client, queryClient]);
};

export const useAttachments = () => {
  const { client } = useHelperClient();
  const [attachments, setAttachments] = useState<File[]>([]);

  const addAttachments = (files: File[] | FileList) => {
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  const prepareAttachments = async () => await Promise.all(attachments.map(client.chat.attachment));

  return { attachments, setAttachments, addAttachments, removeAttachment, clearAttachments, prepareAttachments };
};
