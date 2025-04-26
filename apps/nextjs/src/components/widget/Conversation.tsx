import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "ai";
import { useEffect, useRef, useState } from "react";
import { assertDefined } from "@/components/utils/assert";
import ChatInput from "@/components/widget/ChatInput";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
import type { MessageWithReaction } from "@/components/widget/Message";
import MessagesList from "@/components/widget/MessagesList";
import MessagesSkeleton from "@/components/widget/MessagesSkeleton";
import SupportButtons from "@/components/widget/SupportButtons";
import { useNewConversation } from "@/components/widget/useNewConversation";
import { useWidgetView } from "@/components/widget/useWidgetView";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { sendConversationUpdate } from "@/lib/widget/messages";
import { ReadPageToolConfig } from "@/sdk/types";
import { GuideInstructions } from "@/types/guide";

type Props = {
  token: string | null;
  isGumroadTheme: boolean;
  isNewConversation?: boolean;
  selectedConversationSlug?: string | null;
  readPageTool?: ReadPageToolConfig | null;
  onLoadFailed: () => void;
  isAnonymous: boolean;
  guideEnabled: boolean;
  resumeGuide: GuideInstructions | null;
};

export type Attachment = {
  messageId: string;
  name: string;
  presignedUrl: string;
};

export default function Conversation({
  token,
  isGumroadTheme,
  isNewConversation = false,
  selectedConversationSlug,
  readPageTool,
  onLoadFailed,
  isAnonymous,
  guideEnabled,
  resumeGuide,
}: Props) {
  const { conversationSlug, setConversationSlug, createConversation } = useNewConversation(token);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const { setIsNewConversation } = useWidgetView();

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
    status,
    stop,
    addToolResult,
  } = useChat({
    maxSteps: 3,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      if (readPageTool && toolCall.toolName === readPageTool.toolName) {
        return readPageTool.pageContent || readPageTool.pageHTML;
      }

      if (toolCall.toolName === "request_human_support") {
        setIsEscalated(true);
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        readPageTool,
        guideEnabled,
        message: messages[messages.length - 1],
        conversationSlug,
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

  const isLoading = status === "streaming" || status === "submitted";
  const lastAIMessage = messages.findLast((msg) => msg.role === "assistant");

  const { data: conversation, isLoading: isLoadingConversation } = useQuery<{
    messages: MessageWithReaction[];
    allAttachments: Attachment[];
    isEscalated: boolean;
  } | null>({
    queryKey: ["conversation", conversationSlug],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`/api/chat/conversation/${conversationSlug}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        captureExceptionAndLog(new Error(`Failed to fetch conversation: ${response.statusText}`));
        onLoadFailed();
        return null;
      }
      const data = await response.json();
      if (data.messages) {
        if (data.isEscalated) {
          setIsEscalated(true);
        }

        const guideMessage = data.messages.find((message: any) =>
          message.parts?.some(
            (part: any) => part.type === "tool-invocation" && part.toolInvocation.toolName === "guide_user",
          ),
        );

        if (guideMessage) {
          setMessages([...messages, { ...guideMessage, createdAt: new Date(guideMessage.createdAt) }]);
        }

        return {
          messages: data.messages.map((message: any) => ({
            id: message.id,
            role: message.role as Message["role"],
            content: message.content,
            createdAt: new Date(message.createdAt),
            reactionType: message.reactionType,
            reactionFeedback: message.reactionFeedback,
            annotations: message.annotations,
            parts: message.parts,
            experimental_attachments: message.experimental_attachments,
          })),
          allAttachments: data.allAttachments,
          isEscalated: data.isEscalated,
        };
      }
      return null;
    },
    enabled: !!conversationSlug && !!token && !isNewConversation && !isAnonymous,
  });

  const conversationMessages = conversation?.messages.filter((message) =>
    messages[0]?.createdAt ? assertDefined(message.createdAt) < messages[0]?.createdAt : true,
  );

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

  const handleSubmit = async (screenshotData?: string) => {
    if (!input.trim()) return;

    setData(undefined);

    try {
      let currentSlug = conversationSlug;
      if (!currentSlug) {
        currentSlug = await createConversation({ isPrompt: false });
      }

      if (currentSlug) {
        setIsNewConversation(false);
        handleAISubmit(undefined, {
          experimental_attachments: screenshotData
            ? [{ name: "screenshot.png", contentType: "image/png", url: screenshotData }]
            : [],
          body: { conversationSlug: currentSlug },
        });
      }
    } catch (error) {
      captureExceptionAndLog(error);
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
        messages={[...(conversationMessages ?? []), ...(messages as MessageWithReaction[])]}
        allAttachments={conversation?.allAttachments ?? []}
        conversationSlug={conversationSlug}
        isGumroadTheme={isGumroadTheme}
        token={token}
        stopChat={stop}
        addToolResult={addToolResult}
        resumeGuide={resumeGuide}
      />
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
        isGumroadTheme={isGumroadTheme}
      />
    </>
  );
}
