import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ChatInput from "@/components/widget/ChatInput";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
import type { MessageWithReaction } from "@/components/widget/Message";
import MessagesList from "@/components/widget/MessagesList";
import MessagesSkeleton from "@/components/widget/MessagesSkeleton";
import SupportButtons from "@/components/widget/SupportButtons";
import { useNewConversation } from "@/components/widget/useNewConversation";
import { closeWidget, minimizeWidget, sendConversationUpdate } from "@/lib/widget/messages";
import { ReadPageToolConfig } from "@/sdk/types";

type GuideInstructions = {
  instructions: string;
  callId: string;
};

type Props = {
  token: string | null;
  isGumroadTheme: boolean;
  isNewConversation?: boolean;
  selectedConversationSlug?: string | null;
  readPageTool?: ReadPageToolConfig | null;
  onLoadFailed: () => void;
  isAnonymous: boolean;
  guideInstructions: GuideInstructions | null;
  setIsGuidingUser: (isGuidingUser: boolean) => void;
  setGuideInstructions: (guideInstructions: GuideInstructions | null) => void;
};

export default function Conversation({
  token,
  isGumroadTheme,
  isNewConversation = false,
  selectedConversationSlug,
  readPageTool,
  onLoadFailed,
  isAnonymous,
  guideInstructions,
  setIsGuidingUser,
  setGuideInstructions,
}: Props) {
  const { conversationSlug, setConversationSlug, createConversation } = useNewConversation(token);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isEscalated, setIsEscalated] = useState(false);

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
    setMessages,
    addToolResult,
    status,
    stop,
  } = useChat({
    maxSteps: 3,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      if (readPageTool && toolCall.toolName === readPageTool.toolName) {
        return readPageTool.pageContent || readPageTool.pageHTML;
      }

      if (toolCall.toolName === "guide_user") {
        const args = toolCall.args as { instructions: string };
        setGuideInstructions({ instructions: args.instructions, callId: toolCall.toolCallId });
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        readPageTool,
        message: messages[messages.length - 1],
        conversationSlug,
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const cancelGuide = () => {
    setGuideInstructions(null);
    if (guideInstructions) {
      addToolResult({
        toolCallId: guideInstructions.callId,
        result: "Cancelled, return the text result",
      });
    }
  };

  const startGuide = () => {
    minimizeWidget();
    setIsGuidingUser(true);
    stop();
  };

  useEffect(() => {
    if (selectedConversationSlug && !isNewConversation) {
      setConversationSlug(selectedConversationSlug);
    }
  }, [selectedConversationSlug, isNewConversation, setConversationSlug]);

  const isLoading = status === "streaming" || status === "submitted";
  const lastAIMessage = messages.findLast((msg) => msg.role === "assistant");

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
        if (data.isEscalated) {
          setIsEscalated(true);
        }
        return {
          messages: data.messages.map((message: any) => ({
            id: message.id,
            role: message.role as Message["role"],
            content: message.content,
            createdAt: new Date(message.createdAt),
            reactionType: message.reactionType,
            reactionFeedback: message.reactionFeedback,
          })) as MessageWithReaction[],
          isEscalated: data.isEscalated,
        };
      }
      return null;
    },
    enabled: !!conversationSlug && !!token && !isNewConversation && !isAnonymous,
  });

  useEffect(() => {
    if (status === "ready" || isNewConversation) {
      inputRef.current?.focus();
    }
  }, [status, isNewConversation]);

  useEffect(() => {
    if (isNewConversation) {
      setMessages([]);
      setConversationSlug(null);
      setIsEscalated(false);
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
      setIsEscalated(false);
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

  const handleTalkToTeamClick = () => {
    setIsEscalated(true);
    append({ role: "user", content: "I need to talk to a human" }, { body: { conversationSlug } });
  };

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
        token={token}
        addToolResult={addToolResult}
      />
      {guideInstructions ? (
        <div className="border-t border-black p-4 flex flex-col gap-2">
          <span className="text-xs text-gray-500">{guideInstructions.instructions}</span>
          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={cancelGuide}>
              Cancel Guide
            </Button>
            <Button onClick={startGuide}>Start Guide</Button>
          </div>
        </div>
      ) : (
        <>
          <SupportButtons
            conversationSlug={conversationSlug}
            token={token}
            messageStatus={status}
            lastMessage={lastAIMessage}
            onTalkToTeamClick={handleTalkToTeamClick}
            isEscalated={isEscalated}
          />
          <ChatInput
            input={input}
            inputRef={inputRef}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </>
      )}
    </>
  );
}
