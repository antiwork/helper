"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ConversationDetails } from "@helperai/client";
import { MessageContent, useChat, useConversation, useHelperClient } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRunOnce } from "@/components/useRunOnce";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const ChatWidget = ({
  initialMessage,
  conversation,
  onBack,
}: {
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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Image src="/logo_icon.png" alt="Helper" width={32} height={32} className="rounded" />
            <h1 className="text-xl font-bold text-orange-500">Helper</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                className={cn(
                  "rounded-lg p-3 max-w-[80%]",
                  message.role === "user" ? "border border-orange-300 ml-auto bg-orange-50" : "bg-gray-100",
                )}
                key={message.id}
              >
                <MessageContent className="prose prose-sm max-w-none" message={message} />
              </div>
            ))}
            {agentTyping && <div className="animate-pulse text-gray-500">An agent is typing...</div>}
            {status === "submitted" && <div className="animate-pulse text-gray-500">Thinking...</div>}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              className="flex-1"
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
  const { data: sampleQuestions, isLoading } = api.sampleQuestions.useQuery();
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
    return <ChatWidget initialMessage={question} conversation={conversation} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo_icon.png" alt="Helper" width={80} height={80} className="rounded-lg" />
          </div>
          <h1 className="text-4xl font-bold text-orange-500 mb-2">{mailboxName}</h1>
        </div>

        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question"
              className="w-full px-6 py-4 text-lg border-2 border-blue-300 rounded-full focus:outline-none focus:border-blue-500 pr-16"
              onKeyDown={(e) => {
                if (e.key === "Enter" && question.trim()) {
                  handleQuestionClick();
                }
              }}
            />
            <button
              onClick={() => question.trim() && handleQuestionClick()}
              disabled={!question.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">Recommended</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{question.emoji}</span>
                    <span className="text-gray-800">{question.text}</span>
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
