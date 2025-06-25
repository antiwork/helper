"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { AssignSelect } from "@/components/assignSelect";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConversationsDialogProps {
  children: React.ReactNode;
  assignedToId: string;
  mailboxSlug: string;
  conversations: any;
  description?: string;
  updateConversation: (
    assignedTo: { id: string; displayName: string } | { ai: true } | null,
    conversationSlug: string,
    mailboxSlug: string,
  ) => Promise<void>;
}

interface ConversationItemProps {
  conversation: any;
  onAssignTicket: (assignedTo: { id: string; displayName: string } | { ai: true } | null) => void;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ConversationItem({ conversation, onAssignTicket }: ConversationItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status and Provider */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={`text-xs ${conversation.status}`}>{conversation.status}</Badge>
          {conversation.assignedToAI && <Badge className="text-xs">AI</Badge>}
        </div>

        {/* Subject and Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-medium text-sm truncate max-w-[300px]">{conversation.subject}</h3>
            <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(conversation.createdAt)}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]">{conversation.emailFrom}</span>
            {/* <span className="truncate max-w-[400px]">{conversation.recentMessageText}</span> */}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        <AssignSelect
          selectedUserId={conversation.assignedToId}
          onChange={(id) => onAssignTicket(id)}
          aiOption={conversation.assignedToAI}
        />
      </div>
    </div>
  );
}

export default function ConversationsDialog({
  children,
  mailboxSlug,
  conversations,
  updateConversation,
  description,
}: ConversationsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto scrollbar-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conversations
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* List Header */}
          <div className="flex items-center justify-between p-4 border-b font-medium text-xs">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-20">Status</div>
              <div className="flex-1">Subject & Details</div>
            </div>
            <div className="w-10">Actions</div>
          </div>

          {/* Conversations List */}
          <div className="flex flex-col gap-4">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-12">No conversations found</div>
            ) : (
              conversations.map((conversation: any) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onAssignTicket={(assignedTo: { id: string; displayName: string } | { ai: true } | null) =>
                    updateConversation(assignedTo, conversation.slug, mailboxSlug)
                  }
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
