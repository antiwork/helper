"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ConversationDetails } from "@helperai/client";
import { MessageContent, useChat, useConversation, useHelperClient } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRunOnce } from "@/components/useRunOnce";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const ChatWidget = ({
  mailboxName,
  initialMessage,
  conversation,
  onBack,
}: {
  mailboxName: string;
  initialMessage: string;
  conversation: ConversationDetails;
  onBack: () => void;
}) => {
  const { messages, input, handleInputChange, handleSubmit, agentTyping, status, append } = useChat({
    conversation,
  });

  useRunOnce(() => {
    append({ role: "user", content: initialMessage });
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{mailboxName} Answers</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                className={cn(
                  "rounded-lg p-3 max-w-[80%]",
                  message.role === "user" ? "ml-auto bg-primary" : "border border-primary",
                )}
                key={message.id}
              >
                <MessageContent
                  className={cn("prose prose-sm max-w-none", {
                    "text-primary-foreground": message.role === "user",
                  })}
                  message={message}
                />
              </div>
            ))}
            {agentTyping && <div className="animate-default-pulse text-muted">An agent is typing...</div>}
            {status === "submitted" && (
              <div className="flex items-center gap-1">
                <div className="size-2 bg-foreground rounded-full animate-default-pulse [animation-delay:-0.3s]" />
                <div className="size-2 bg-foreground rounded-full animate-default-pulse [animation-delay:-0.15s]" />
                <div className="size-2 bg-foreground rounded-full animate-default-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const HomepageContent = ({ mailboxName }: { mailboxName: string }) => {
  const [question, setQuestion] = useState("");
  const [chatConversationSlug, setChatConversationSlug] = useState<string | null>(null);
  const { data: sampleQuestions, isLoading, error } = api.sampleQuestions.useQuery();
  const { client } = useHelperClient();

  // Get conversation details when conversationSlug is available
  const { data: conversation } = useConversation(
    chatConversationSlug!,
    { enableRealtime: false },
    { enabled: !!chatConversationSlug },
  );

  const handleQuestionClick = async () => {
    const result = await client.conversations.create();
    setChatConversationSlug(result.conversationSlug);
  };

  const handleBackToMain = () => {
    setChatConversationSlug(null);
    setQuestion("");
  };

  if (chatConversationSlug && conversation) {
    return (
      <ChatWidget
        mailboxName={mailboxName}
        initialMessage={question}
        conversation={conversation}
        onBack={handleBackToMain}
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="max-w-4xl mx-auto px-4 py-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{mailboxName} Answers</h1>
        </div>

        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question"
              className="w-full px-6 py-4 text-lg rounded-full pr-16"
              onKeyDown={(e) => {
                if (e.key === "Enter" && question.trim()) {
                  handleQuestionClick();
                }
              }}
            />
            <button
              onClick={() => question.trim() && handleQuestionClick()}
              disabled={!question.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mb-8">
          {error ? null : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-4.5 border rounded-lg">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sampleQuestions?.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuestion(question.text);
                    handleQuestionClick();
                  }}
                  className="p-4 border rounded-lg hover:bg-secondary text-left transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{question.emoji}</span>
                    {question.text}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
