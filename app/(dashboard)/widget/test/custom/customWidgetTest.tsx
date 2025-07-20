"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { HelperClient, Conversation, CreateConversationParams, CreateConversationResult } from "@helperai/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";

interface CustomWidgetTestProps {
  client: HelperClient;
}

export const CustomWidgetTest = ({ client }: CustomWidgetTestProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const router = useRouter();

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.conversations.list();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-semibold">Support</h1>
        <NewTicketModal
          client={client}
          open={showNewTicketModal}
          onOpenChange={setShowNewTicketModal}
          onTicketCreated={(slug) => {
            window.location.href = `/widget/test/custom/${slug}`;
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationTable
          conversations={conversations}
          onSelectConversation={(slug) => router.push(`/widget/test/custom/${slug}`)}
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
          <div className="font-medium truncate">{conversation.subject || "No subject"}</div>
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

const NewTicketModal = ({
  client,
  open,
  onOpenChange,
  onTicketCreated,
}: {
  client: HelperClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: (slug: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim()) return;

    try {
      setLoading(true);
      const result = await client.conversations.create({
        subject: subject.trim(),
        isPrompt: true,
      });
      onTicketCreated(result.conversationSlug);
      setSubject("");
      setMessage("");
    } catch (error) {
      captureExceptionAndLog(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>+ New ticket</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Brief description of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Describe your issue in detail"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !subject.trim()}>
              {loading ? "Creating..." : "Create ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
