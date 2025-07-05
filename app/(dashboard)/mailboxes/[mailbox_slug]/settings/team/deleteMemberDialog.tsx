"use client";

import { useState } from "react";
import { AssigneeOption, AssignSelect } from "@/components/assignSelect";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

interface DeleteMemberDialogProps {
  children: React.ReactNode;
  assignedToId: string;
  mailboxSlug: string;
  description?: string;
  conversationIds: string[];
}

export default function DeleteMemberDialog({
  children,
  mailboxSlug,
  description,
  assignedToId,
  conversationIds,
}: DeleteMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(null);
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: updateConversation } = api.mailbox.conversations.update.useMutation({
    onError: (error) => {
      setLoading(false);
      toast({
        title: "Failed to update conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: removeTeamMember } = api.mailbox.members.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Team member removed",
        variant: "success",
      });
      utils.mailbox.members.list.invalidate({ mailboxSlug });
      utils.mailbox.conversations.list.invalidate({ mailboxSlug });
      setLoading(false);
      setAssignedTo(null);
      setAssignMessage("");
      setIsOpen(false);
    },
    onError: (error) => {
      setLoading(false);
      setAssignedTo(null);
      setAssignMessage("");
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

  const handleAssignSubmit = async () => {
    setLoading(true);
    if (conversationIds.length > 0) {
      if (!assignedTo) {
        toast({
          variant: "destructive",
          title: "Please select a valid assignee",
        });
        setLoading(false);
        return;
      }

      try {
        const updatePromises = conversationIds.map((conversationId) => {
          if ("ai" in assignedTo) {
            return updateConversation({
              mailboxSlug,
              conversationSlug: conversationId,
              assignedToAI: true,
              message: assignMessage,
            });
          } else {
            return updateConversation({
              mailboxSlug,
              conversationSlug: conversationId,
              assignedToId: assignedTo.id,
              message: assignMessage,
            });
          }
        });

        await Promise.all(updatePromises);
      } catch (error) {
        setLoading(false);
        return;
      }
    }
    removeTeamMember({ id: assignedToId, mailboxSlug });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Remove Team Member</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {conversationIds.length > 0 && (
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">
              Reassign {conversationIds.length ? `(${conversationIds.length})` : ""} tickets to
            </h4>
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
        )}
        <Button onClick={handleAssignSubmit} disabled={loading} variant="destructive">
          {loading ? "Removing member..." : "Confirm Removal"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
