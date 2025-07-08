"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AssigneeOption, AssignSelect } from "@/components/assignSelect";
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
  assignedToId: { id: string; displayName: string };
  mailboxSlug: string;
  description?: string;
  conversationIds: number[];
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
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(assignedToId);
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: updateBulkConversation } = api.mailbox.conversations.bulkUpdate.useMutation({
    onError: (error) => {
      setLoading(false);
      toast.error("Failed to update conversation", { description: error.message });
    },
  });

  const { mutate: removeTeamMember } = api.mailbox.members.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.members.list.invalidate({ mailboxSlug });
      utils.mailbox.conversations.list.invalidate({ mailboxSlug });
    },
  });

  const handleAssignSelectChange = (assignee: AssigneeOption | null) => {
    setAssignedTo(assignee);
  };


  const handleAssignSubmit = async () => {
    setLoading(true);
    const cleanup = () => {
      setLoading(false);
      setAssignedTo(null);
      setAssignMessage("");
      setIsOpen(false);
    };
    if (conversationIds.length > 0) {
      if (!assignedTo) {
        toast.error("Please select a valid assignee");
        setLoading(false);
        return;
      }
      try {
        const handleRemoveMember = async () => {
          try {
            await new Promise((resolve, reject) => {
              removeTeamMember(
                { id: assignedToId.id, mailboxSlug }, 
                {
                onSuccess: resolve,
                onError: reject,
                }
              );
            });
            return true;
          } catch (error) {
            toast.error("Failed to remove member");
            return false;
          }
        };

          const handleSuccessfulReassignment = async (updatedImmediately: boolean) => {
            const removed = await handleRemoveMember();
            if (removed) {
              const title = updatedImmediately 
                ? "Member removed from the Team"
                : "Member will be removed from the Team";
              const description = updatedImmediately 
                ? undefined
                : "Please refresh the page to see the changes";
              
              toast.success(title, {
                description,
              });
              utils.mailbox.members.invalidate();
              cleanup();
            }
          };

        if ("ai" in assignedTo) {
          await updateBulkConversation(
            {
              mailboxSlug,
              conversationFilter: conversationIds,
              assignedToAI: true,
              assignedToId: undefined,
              prevAssigneeId: assignedToId.id,
              message: assignMessage,
            },
            {
              onSuccess: async ({ updatedImmediately }) => {
                await handleSuccessfulReassignment(updatedImmediately);
              },
              onError: (error) => {
                toast.error("Failed to reassign conversations");
                setLoading(false);
              },
            },
          );
          return;
        }
        await updateBulkConversation(
          {
            mailboxSlug,
            conversationFilter: conversationIds,
            assignedToId: assignedTo.id,
            prevAssigneeId: assignedToId.id,
            message: assignMessage,
            assignedToAI: false,
          },
          {
            onSuccess: async ({ updatedImmediately }) => {
              await handleSuccessfulReassignment(updatedImmediately);
            },
            onError: (error) => {
              toast.error("Error while removing member");
              setLoading(false);
            },
          },
        );
      } catch (error) {
        setLoading(false);
      }
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        removeTeamMember(
          { id: assignedToId.id, mailboxSlug },
          {
            onSuccess: resolve,
            onError: reject,
          },
        );
      });
      toast.success("Member removed from the Team");
      utils.mailbox.members.invalidate();
      cleanup();
    } catch (error) {
      toast.error("Failed to remove member");
      setLoading(false);
    }
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
            <AssignSelect
              selectedUserId={assignedTo && "id" in assignedTo ? assignedTo.id : undefined}
              onChange={handleAssignSelectChange}
              aiOption
            />
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
