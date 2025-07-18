"use client";

import { useEffect, useState } from "react";
import { useChat, useConversations, useCreateConversation } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";

export const CustomWidgetTest = () => {
  const { conversations, loading, error } = useConversations();
  const [selectedConversationSlug, setSelectedConversationSlug] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketMessage, setNewTicketMessage] = useState("");

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-semibold">Support</h1>
          <NewTicketModal
            open={showNewTicketModal}
            onOpenChange={setShowNewTicketModal}
            onTicketCreated={(slug, message) => {
              setSelectedConversationSlug(slug);
              setNewTicketMessage(message);
              setShowNewTicketModal(false);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationTable
            conversations={conversations}
            selectedSlug={selectedConversationSlug}
            onSelectConversation={(slug) => {
              setSelectedConversationSlug(slug);
              setNewTicketMessage("");
            }}
          />
        </div>
      </div>

      <div className="w-1/2 flex flex-col">
        {selectedConversationSlug ? (
          <ChatWidget conversationSlug={selectedConversationSlug} newTicketMessage={newTicketMessage} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to view details
          </div>
        )}
      </div>
    </div>
  );
};

const ConversationTable = ({
  conversations,
  selectedSlug,
  onSelectConversation,
}: {
  conversations: {
    slug: string;
    subject: string;
    createdAt: string;
    latestMessage: string | null;
    latestMessageCreatedAt: string | null;
    messageCount: number;
  }[];
  selectedSlug: string | null;
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
            selectedSlug === conversation.slug && "bg-amber-50 dark:bg-white/5 border-l-4 border-l-amber-400",
          )}
          onClick={() => onSelectConversation(conversation.slug)}
        >
          <div className="font-medium truncate">{conversation.subject || "No subject"}</div>
          <div className="text-sm text-muted-foreground">{conversation.messageCount}</div>
          <div className="text-sm text-muted-foreground">
            {conversation.latestMessageCreatedAt
              ? new Date(conversation.latestMessageCreatedAt).toLocaleDateString()
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
  open,
  onOpenChange,
  onTicketCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: (slug: string, message: string) => void;
}) => {
  const { createConversation, loading } = useCreateConversation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim()) return;

    try {
      const result = await createConversation({
        subject: subject.trim(),
        isPrompt: true,
      });
      onTicketCreated(result.conversationSlug, message);
      setSubject("");
      setMessage("");
    } catch (error) {
      captureExceptionAndLog(error);
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

const ChatWidget = ({ conversationSlug, newTicketMessage }: { conversationSlug: string; newTicketMessage: string }) => {
  const { messages, input, handleInputChange, handleSubmit, append, conversation } = useChat(conversationSlug, {
    tools: {
      getProductStatus: {
        description: "Get the status of a Gumroad product",
        parameters: {
          productId: { type: "string", description: "The ID of the Gumroad product" },
        },
        execute: ({ productId }) => {
          return `The status of ${productId} is ${Math.random() > 0.5 ? "active" : "inactive"}`;
        },
      },
    },
  });

  useEffect(() => {
    if (conversation?.messages.length === 0 && messages.length === 0 && newTicketMessage) {
      append({ role: "user", content: newTicketMessage });
    }
  }, [conversation, newTicketMessage, messages, append]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">{conversation?.subject}</h2>
      </div>

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
    </div>
  );
};
