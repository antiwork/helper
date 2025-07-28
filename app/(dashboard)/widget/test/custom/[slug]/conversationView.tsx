"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationDetails } from "@helperai/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHelperClient } from "@/packages/react/src/components/helperClientProvider";
import { useConversation } from "@/packages/react/src/hooks/useConversations";

export const ConversationView = ({ conversationSlug }: { conversationSlug: string }) => {
  const router = useRouter();
  const {
    data: conversation,
    isLoading,
    error,
  } = useConversation(conversationSlug, {
    markRead: true,
    enableRealtime: true,
  });

  if (isLoading) {
    return <div className="p-4">Loading conversation...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading conversation: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!conversation) {
    return <div className="p-4">Conversation not found</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/widget/test/custom")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to conversations
        </Button>
        <h2 className="font-semibold">{conversation?.subject || "Chat"}</h2>
      </div>
      <ChatView conversation={conversation} />
    </div>
  );
};

const ChatView = ({ conversation }: { conversation: ConversationDetails }) => {
  const client = useHelperClient();
  const [isTyping, setIsTyping] = useState(false);
  const { messages, setMessages, input, handleInputChange, handleSubmit } = useChat({
    ...client.chat.handler({
      conversation,
      tools: {
        getProductStatus: {
          description: "Get the status of a Gumroad product",
          parameters: {
            productId: { type: "string", description: "The ID of the Gumroad product" },
          },
          execute: ({ productId }: { productId: string }) => {
            return `The status of ${productId} is ${Math.random() > 0.5 ? "active" : "inactive"}`;
          },
        },
      },
    }),
  });

  useEffect(() => {
    const unlisten = client.conversations.listen(conversation.slug, {
      onHumanReply: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onTyping: (isTyping) => {
        setIsTyping(isTyping);
      },
    });
    return () => unlisten();
  }, [conversation.slug, client]);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              className={cn(
                "rounded-lg p-3 max-w-[80%]",
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-secondary text-secondary-foreground",
              )}
              key={message.id}
            >
              {message.content ? message.content : JSON.stringify(message)}
            </div>
          ))}
          {isTyping && <div className="animate-pulse">An agent is typing...</div>}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button onClick={handleSubmit}>Send</Button>
        </div>
      </div>
    </>
  );
};
