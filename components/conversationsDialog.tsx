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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { toast } from "./hooks/use-toast";
import { Button } from "./ui/button";

interface ConversationsDialogProps {
  children: React.ReactNode;
  assignedToId: string;
  mailboxSlug: string;
  description?: string;
  conversationIds: string[];
}

export type AssigneeOption =
  | {
      id: string;
      displayName: string;
    }
  | { ai: true };

export default function ConversationsDialog({
  children,
  mailboxSlug,
  description,
  assignedToId,
  conversationIds,
}: ConversationsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(null);
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

   const { mutateAsync: updateConversation, isPending: isUpdating } = api.mailbox.conversations.update.useMutation({
    onSuccess: () => {
      utils.mailbox.conversations.list.invalidate({ mailboxSlug });
    },
    onError: (error) => {
      toast({
        title: "Failed to update conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: removeTeamMember, isPending: isRemoving } = api.mailbox.members.delete.useMutation({
      onSuccess: () => {
        toast({
          title: "Team member removed",
          variant: "success",
        });
        utils.mailbox.members.list.invalidate({ mailboxSlug });
        setLoading(false);
        setAssignedTo(null);
        setAssignMessage("");
        setIsOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Failed to remove member",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleAssignSelectChange = (assignee: AssigneeOption | null) => {
    setAssignedTo(assignee);
  };

  const handleAssignSubmit = () => {
    setLoading(true);
    if (!assignedTo || !("id" in assignedTo)) {
      toast({
        variant: "destructive",
        title: "Please select a valid assignee",
      });
      return;
    }

    for (const conversationId of conversationIds || []) {
      if (assignedTo && "ai" in assignedTo) {
        updateConversation({ mailboxSlug, conversationSlug: conversationId, assignedToAI: true });
      }else{
        updateConversation({ mailboxSlug, conversationSlug: conversationId, assignedToId: assignedTo.id });
      }
    }

    removeTeamMember({ id: assignedToId, mailboxSlug });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conversations
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <h4 className="font-medium">Assign conversation {conversationIds.length ? `(${conversationIds.length})` : ""}</h4>

          <AssignSelect selectedUserId={assignedToId} onChange={handleAssignSelectChange} aiOption />

          <div className="grid gap-1">
            <Label htmlFor="assignMessage">Message</Label>
            <Textarea
              name="assignMessage"
              placeholder="Add an optional reason for assignment..."
              value={assignMessage}
              rows={3}
              onChange={(e) => setAssignMessage(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleAssignSubmit} variant="destructive">
          Reassign and delete member
        </Button>
      </DialogContent>
    </Dialog>
  );
}
