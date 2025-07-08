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
  count: number;
}

export default function DeleteMemberDialog({
  children,
  mailboxSlug,
  description,
  assignedToId,
  count,
}: DeleteMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(assignedToId);
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: reAssignAll } = api.mailbox.conversations.reAssignAll.useMutation({
    onError: (error) => {
      setLoading(false);
      toast.error("Failed to update conversation", { description: error.message });
    },
  });

  const { mutate: removeTeamMember } = api.mailbox.members.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.members.list.invalidate({ mailboxSlug });
      utils.organization.getMembers.invalidate();
      cleanup();
    },
  });

  const handleAssignSelectChange = (assignee: AssigneeOption | null) => {
    setAssignedTo(assignee);
  };

  const cleanup = () => {
    setLoading(false);
    setAssignedTo(null);
    setAssignMessage("");
    setIsOpen(false);
  };

  const handleAssignSubmit = async () => {
    setLoading(true);

    try {
      if (count > 0) {
        if (!assignedTo) {
          toast.error("Please select a valid assignee");
          setLoading(false);
          return;
        }

        // 1. Reassign all conversations
        const result = await reAssignAll(
          "ai" in assignedTo
            ? {
                mailboxSlug,
                conversationFilter: {},
                assignedToAI: true,
                assignedToId: undefined,
                prevAssigneeId: assignedToId.id,
                message: assignMessage,
                count,
              }
            : {
                mailboxSlug,
                conversationFilter: {},
                assignedToId: assignedTo.id,
                prevAssigneeId: assignedToId.id,
                message: assignMessage,
                assignedToAI: false,
                count,
              },
        );

        await removeTeamMember({ id: assignedToId.id, mailboxSlug });

        const title = result.updatedImmediately
          ? "Member removed from the Team"
          : "Member will be removed from the Team";

        const description = result.updatedImmediately ? undefined : "Please refresh the page to see the changes";

        toast.success(title, { description });
      } else {
        await removeTeamMember({ id: assignedToId.id, mailboxSlug });

        toast.success("Member removed from the Team");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Something went wrong");
      console.error(error);
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

        {count > 0 && (
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">Reassign {count} tickets to</h4>

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
