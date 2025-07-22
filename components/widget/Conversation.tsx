import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "ai";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
type ConversationResult = any;
import { ReadPageToolConfig } from "@helperai/sdk/dist/types/utils";
import { assertDefined } from "@/components/utils/assert";
import ChatInput from "@/components/widget/ChatInput";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
import type { MessageWithReaction } from "@/components/widget/Message";
import MessagesList from "@/components/widget/MessagesList";
import MessagesSkeleton from "@/components/widget/MessagesSkeleton";
import SupportButtons from "@/components/widget/SupportButtons";
import { useNewConversation } from "@/components/widget/useNewConversation";
import { useWidgetView, View } from "@/components/widget/useWidgetView";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { sendConversationUpdate } from "@/lib/widget/messages";
import { GuideInstructions } from "@/types/guide";
import { useHelperClientContext } from "./helperClientProvider";

type Props = {
  token: string | null;
  isGumroadTheme: boolean;
  isNewConversation?: boolean;
  selectedConversationSlug?: string | null;
  readPageTool?: ReadPageToolConfig | null;
  onLoadFailed: () => void;
  guideEnabled: boolean;
  resumeGuide: GuideInstructions | null;
  currentView: View;
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
  guideEnabled,
  resumeGuide,
  currentView,
}: Props) {
  const { conversationSlug, setConversationSlug, createConversation } = useNewConversation(token);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isProvidingDetails, setIsProvidingDetails] = useState(false);
  const { setIsNewConversation } = useWidgetView();
  const [helperConversation, setHelperConversation] = useState<ConversationResult | null>(null);
  const { client } = useHelperClientContext();

  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const agentTypingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!selectedConversationSlug || !token || !client) return;
      try {
        const conversationData = await client.conversations.get(selectedConversationSlug);
        setHelperConversation(conversationData);
        setIsEscalated(conversationData.isEscalated);
      } catch (error) {
        captureExceptionAndLog(error);
      }
    };
    fetchConversation();
  }, [selectedConversationSlug, client, token]);

  useEffect(() => {
    if (!selectedConversationSlug || !client) return;

    const unlisten = client.chat.listen(selectedConversationSlug, {
      onHumanReply: (message: any) => {
        setIsAgentTyping(false);
        if (agentTypingTimeoutRef.current) {
          clearTimeout(agentTypingTimeoutRef.current);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: new Date(),
            reactionType: null,
            reactionFeedback: null,
            reactionCreatedAt: null,
          },
        ]);
      },
      onTyping: (isTyping: boolean) => {
        setIsAgentTyping(isTyping);
        if (isTyping) {
          if (agentTypingTimeoutRef.current) {
            clearTimeout(agentTypingTimeoutRef.current);
          }
          agentTypingTimeoutRef.current = setTimeout(() => {
            setIsAgentTyping(false);
          }, 10000);
        }
      },
    });

    return () => unlisten();
  }, [selectedConversationSlug, client]);

  useEffect(() => {
    return () => {
      if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
    };
  }, []);

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
  } = useChat(
    helperConversation
      ? {
          ...client.chat.handler({
            conversation: helperConversation,
            tools: {},
          }),
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
          onError: (error) => {
            captureExceptionAndLog(error);

            setMessages((messages) => [
              ...messages,
              {
                id: `error_${Date.now()}`,
                role: "system",
                content: "Sorry, there was an error processing your request. Please try again.",
              },
            ]);
          },
        }
      : {
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
            const lastMessage = messages[messages.length - 1];
            const isToolResult = lastMessage?.parts?.some(
              (part) => part.type === "tool-invocation" && part.toolInvocation.state === "result",
            );

            return {
              id,
              readPageTool,
              guideEnabled,
              message: lastMessage,
              conversationSlug,
              isToolResult,
              ...requestBody,
            };
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
          onError: (error) => {
            captureExceptionAndLog(error);

            setMessages((messages) => [
              ...messages,
              {
                id: `error_${Date.now()}`,
                role: "system",
                content: "Sorry, there was an error processing your request. Please try again.",
              },
            ]);
          },
        },
  );

  useEffect(() => {
    if (selectedConversationSlug && !isNewConversation) {
      setConversationSlug(selectedConversationSlug);
    }
  }, [selectedConversationSlug, isNewConversation, setConversationSlug]);

  const isLoading = status === "streaming" || status === "submitted";
  const lastAIMessage = messages?.findLast((msg) => msg.role === "assistant");

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
        const text = await response.text().catch(() => null);
        captureExceptionAndLog(new Error(`Failed to fetch conversation: ${response.status}`), {
          extra: { conversationSlug, text },
        });
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
    enabled: !!conversationSlug && !!token && !isNewConversation,
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

  const handleSubmit = async (screenshotData?: string, attachments?: File[]) => {
    if (!input.trim() && !screenshotData && (!attachments || attachments.length === 0)) return;

    setData(undefined);

    try {
      let currentSlug = conversationSlug;
      if (!currentSlug) {
        currentSlug = await createConversation({ isPrompt: false });
      }

      if (currentSlug) {
        setIsNewConversation(false);

        const attachmentsToSend = [];

        if (screenshotData) {
          attachmentsToSend.push({
            name: "screenshot.png",
            contentType: "image/png",
            url: screenshotData,
          });
        }

        if (attachments && attachments.length > 0) {
          const filePromises = attachments.map(async (file) => {
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
                reader.readAsDataURL(file);
              });

              return {
                name: file.name,
                contentType: file.type,
                url: dataUrl,
              };
            } catch (error) {
              captureExceptionAndLog(error);
              return null;
            }
          });

          const fileResults = await Promise.all(filePromises);
          fileResults.forEach((result) => {
            if (result) {
              attachmentsToSend.push(result);
            }
          });
        }

        handleAISubmit(undefined, {
          experimental_attachments: attachmentsToSend,
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

  useEffect(() => {
    setIsProvidingDetails(false);
  }, [lastAIMessage]);

  const handleTalkToTeamClick = () => {
    setIsEscalated(true);
    append({ role: "user", content: "I need to talk to a human" }, { body: { conversationSlug } });
  };

  const handleAddDetailsClick = () => {
    inputRef.current?.focus();
    setIsProvidingDetails(true);
  };

  if (currentView !== "chat") return null;

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
        status={status}
      />
      {isAgentTyping && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          Support agent is typing...
        </div>
      )}
      <AnimatePresence>
        <SupportButtons
          conversationSlug={conversationSlug}
          token={token}
          messageStatus={status}
          lastMessage={lastAIMessage}
          onTalkToTeamClick={handleTalkToTeamClick}
          onAddDetailsClick={handleAddDetailsClick}
          isGumroadTheme={isGumroadTheme}
          isEscalated={isEscalated}
        />
      </AnimatePresence>
      <ChatInput
        input={input}
        inputRef={inputRef}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        isGumroadTheme={isGumroadTheme}
        placeholder={isProvidingDetails ? "Provide additional details..." : "Ask a question..."}
      />
    </>
  );
}
