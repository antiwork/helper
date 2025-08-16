"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConversation } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { ChatView } from "./chatView";
import { ThreadView } from "./threadView";

type ViewMode = "chat" | "thread";

export const ConversationView = ({ conversationSlug }: { conversationSlug: string }) => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const { data: conversation, isLoading, error } = useConversation(conversationSlug);

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
        <Button variant="ghost" size="sm" onClick={() => router.push(`/widget/test/custom${location.search}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to conversations
        </Button>
        <h2 className="font-semibold flex-1">{conversation?.subject || "Chat"}</h2>

        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button
            variant={viewMode === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("chat")}
            className="text-xs h-7"
          >
            Real-time Chat
          </Button>
          <Button
            variant={viewMode === "thread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("thread")}
            className="text-xs h-7"
          >
            Thread View
          </Button>
        </div>
      </div>

      {viewMode === "chat" ? <ChatView conversation={conversation} /> : <ThreadView conversation={conversation} />}
    </div>
  );
};
