import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "ai";
import { useEffect, useRef } from "react";
import ChatInput from "@/components/widget/ChatInput";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
import type { MessageWithReaction } from "@/components/widget/Message";
import MessagesList from "@/components/widget/MessagesList";
import MessagesSkeleton from "@/components/widget/MessagesSkeleton";
import { useNewConversation } from "@/components/widget/useNewConversation";
import { sendConversationUpdate } from "@/lib/widget/messages";
import { ReadPageToolConfig } from "@/sdk/types";

type Props = {
  token: string | null;
  isGumroadTheme: boolean;
  isNewConversation?: boolean;
  selectedConversationSlug?: string | null;
  readPageTool?: ReadPageToolConfig | null;
  onLoadFailed: () => void;
  isAnonymous: boolean;
};

export default function Conversation({
  token,
  isGumroadTheme,
  isNewConversation = false,
  selectedConversationSlug,
  readPageTool,
  onLoadFailed,
  isAnonymous,
}: Props) {
  const { conversationSlug, setConversationSlug, createConversation } = useNewConversation(token);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversationSlug) {
      sendConversationUpdate(conversationSlug);
    }
  }, [conversationSlug]);

  const {
    data,
    setData,
    messages,
    input,
    handleInputChange,
    handleSubmit: handleAISubmit,
    append,
    isLoading,
    setMessages,
    addToolResult,
  } = useChat({
    maxSteps: 3,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      if (readPageTool && toolCall.toolName === readPageTool.toolName) {
        return readPageTool.pageContent || readPageTool.pageHTML;
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        readPageTool,
        message: messages[messages.length - 1],
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  useEffect(() => {
    if (selectedConversationSlug && !isNewConversation) {
      setConversationSlug(selectedConversationSlug);
    }
  }, [selectedConversationSlug, isNewConversation, setConversationSlug]);

  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["conversation", conversationSlug],
    queryFn: async () => {
      const response = await fetch(`/api/chat/conversation/${conversationSlug}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.error("Failed to fetch conversation:", response.statusText);
        onLoadFailed();
        return null;
      }
      const data = await response.json();
      if (data.messages) {
        return {
          messages: data.messages.map((message: any) => ({
            id: message.id,
            role: message.role as Message["role"],
            content: message.content,
            createdAt: new Date(message.createdAt),
            reactionType: message.reactionType,
            reactionFeedback: message.reactionFeedback,
          })) as MessageWithReaction[],
        };
      }
      return null;
    },
    enabled: !!conversationSlug && !!token && !isNewConversation && !isAnonymous,
  });

  useEffect(() => {
    if (conversation?.messages?.length) {
      setMessages(conversation.messages);
    }
  }, [conversation, setMessages]);

  useEffect(() => {
    if (!isLoading || isNewConversation) {
      inputRef.current?.focus();
    }
  }, [isLoading, isNewConversation]);

  useEffect(() => {
    if (isNewConversation) {
      setMessages([]);
      setConversationSlug(null);
    }
  }, [isNewConversation, setMessages, setConversationSlug]);

  const handleSubmit = async (e?: { preventDefault: () => void }) => {
    if (e) {
      e.preventDefault();
    }

    if (!input.trim()) return;

    setData(undefined);

    try {
      let currentSlug = conversationSlug;
      if (!currentSlug) {
        currentSlug = await createConversation({ isPrompt: false });
      }

      if (currentSlug) {
        handleAISubmit(e, { body: { conversationSlug: currentSlug } });
      }
    } catch (error) {
      console.error("Error submitting message:", error);
    }
  };

  useEffect(() => {
    if (!token) return;

    const handleDataChange = async (message: unknown) => {
      const slug = await createConversation({ isPrompt: true });
      setMessages([]);
      setConversationSlug(slug);
      append({ role: "user", content: message as string }, { body: { conversationSlug: slug } });
    };

    // Process queued messages first
    messageQueue.forEach((message) => handleDataChange(message));
    messageQueue.length = 0; // Clear the queue
    eventBus.on("PROMPT", handleDataChange);

    return () => {
      eventBus.off("PROMPT", handleDataChange);
    };
  }, [token]);

  const lastMessage = messages[messages.length - 1];
  const showLoadingAnimation = isLoading && (lastMessage?.content?.length === 0 || lastMessage?.role !== "assistant");

  if (isLoadingConversation && !isNewConversation && selectedConversationSlug) {
    return <MessagesSkeleton />;
  }

  return (
    <>
      <MessagesList
        data={data ?? null}
        messages={messages as MessageWithReaction[]}
        conversationSlug={conversationSlug}
        isGumroadTheme={isGumroadTheme}
        showLoadingAnimation={showLoadingAnimation}
        token={token}
        addToolResult={addToolResult}
      />
      <ChatInput
        input={input}
        inputRef={inputRef}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </>
  );
}
