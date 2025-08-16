"use client";

import { useRouter } from "next/navigation";
import { useConversations, useCreateConversation } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";

export const CustomWidgetTest = () => {
  const { data: conversationsData, isLoading: loading, error } = useConversations();
  const createConversation = useCreateConversation();
  const router = useRouter();

  const conversations = conversationsData?.conversations || [];

  const handleCreate = async () => {
    try {
      const result = await createConversation.mutateAsync({});
      router.push(`/widget/test/custom/${result.conversationSlug}${location.search}`);
    } catch (error) {
      captureExceptionAndLog(error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error instanceof Error ? error.message : "Failed to fetch conversations"}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-semibold">Support</h1>
        <Button onClick={handleCreate} disabled={createConversation.isPending}>
          {createConversation.isPending ? "Creating..." : "+ New ticket"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationTable
          conversations={conversations}
          onSelectConversation={(slug) => router.push(`/widget/test/custom/${slug}${location.search}`)}
        />
      </div>
    </div>
  );
};

const ConversationTable = ({
  conversations,
  onSelectConversation,
}: {
  conversations: {
    slug: string;
    subject: string;
    createdAt: string;
    latestMessage: string | null;
    latestMessageAt: string | null;
    messageCount: number;
    isUnread: boolean;
  }[];
  onSelectConversation: (slug: string) => void;
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-border bg-muted/50 text-sm font-medium text-muted-foreground">
        <div>Subject</div>
        <div>Messages</div>
        <div>Last updated</div>
      </div>

      {conversations.map((conversation) => (
        <div
          key={conversation.slug}
          className={cn(
            "grid grid-cols-3 gap-4 p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
          )}
          onClick={() => onSelectConversation(conversation.slug)}
        >
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{conversation.subject || "No subject"}</div>
            {conversation.isUnread && <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-blue-500 shrink-0" />}
          </div>
          <div className="text-sm text-muted-foreground">{conversation.messageCount}</div>
          <div className="text-sm text-muted-foreground">
            {conversation.latestMessageAt
              ? new Date(conversation.latestMessageAt).toLocaleDateString()
              : new Date(conversation.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}

      {conversations.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No conversations found. Create your first ticket to get started.
        </div>
      )}
    </div>
  );
};
