import { useChat } from "@ai-sdk/react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ConversationDetails } from "@helperai/client";
import { ReadPageToolConfig } from "@helperai/sdk/dist/types/utils";
import ChatInput from "@/components/widget/ChatInput";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
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
  selectedConversationSlug,
  readPageTool,
  onLoadFailed,
  guideEnabled,
  resumeGuide,
  currentView,
}: Props) {
  const { conversationSlug, setConversationSlug, createConversation } = useNewConversation(token);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isProvidingDetails, setIsProvidingDetails] = useState(false);
  const { isNewConversation, setIsNewConversation } = useWidgetView();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const { client } = useHelperClientContext();

  useEffect(() => {
    const fetchConversation = async () => {
      if (!selectedConversationSlug || !token || !client) return;
      try {
        const conversationData = await client.conversations.get(selectedConversationSlug);
        setConversation(conversationData);
        setIsEscalated(conversationData.isEscalated);
      } catch (error) {
        captureExceptionAndLog(error);
      }
    };
    fetchConversation();
  }, [selectedConversationSlug, client, token]);

  useEffect(() => {
    if (conversationSlug) {
      sendConversationUpdate(conversationSlug);
    }
  }, [conversationSlug]);

  useEffect(() => {
    if (selectedConversationSlug && !isNewConversation) {
      setConversationSlug(selectedConversationSlug);
    }
  }, [selectedConversationSlug, isNewConversation, setConversationSlug]);

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

  if (currentView !== "chat") return null;

  if (isLoadingConversation && !isNewConversation && selectedConversationSlug) {
    return <MessagesSkeleton />;
  }

  return <ChatView conversation={conversation} readPageTool={readPageTool} />;
}

const ChatView = ({
  conversation,
  readPageTool,
}: {
  conversation: ConversationDetails;
  readPageTool: ReadPageToolConfig | null;
}) => {
  const { client } = useHelperClientContext();
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatHandler = client.chat.handler({
    conversation,
    tools: {},
  });

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
    ...chatHandler,
    maxSteps: 3,
    onToolCall({ toolCall }) {
      if (readPageTool && toolCall.toolName === readPageTool.toolName) {
        return readPageTool.pageContent || readPageTool.pageHTML;
      }

      if (toolCall.toolName === "request_human_support") {
        setIsEscalated(true);
        return;
      }

      chatHandler.onToolCall({ toolCall });
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
  });

  useEffect(() => {
    const unlisten = client.chat.listen(conversation.slug, {
      onHumanReply: (message) => {
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
      onTyping: (isTyping) => {
        setIsAgentTyping(isTyping);
      },
    });

    return () => unlisten();
  }, [conversation.slug, client]);

  const handleTalkToTeamClick = () => {
    setIsEscalated(true);
    append({ role: "user", content: "I need to talk to a human" }, { body: { conversationSlug } });
  };

  const handleAddDetailsClick = () => {
    inputRef.current?.focus();
    setIsProvidingDetails(true);
  };

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

  const isLoading = status === "streaming" || status === "submitted";
  const lastAIMessage = messages?.findLast((msg) => msg.role === "assistant");

  return (
    <>
      <MessagesList
        data={data ?? null}
        messages={client.chat.messages(messages)}
        conversationSlug={conversation.slug}
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
};
