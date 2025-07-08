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
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/react";

interface DeleteMemberDialogProps {
  children: React.ReactNode;
  member: { id: string; displayName: string };
  description?: string;
  assignedConversationCount: number;
}

export default function DeleteMemberDialog({
  children,
  description,
  member,
  assignedConversationCount,
}: DeleteMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(member);
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: bulkUpdate } = api.mailbox.conversations.bulkUpdate.useMutation({
    onError: (error) => {
      setLoading(false);
      toast.error("Failed to update conversation", { description: error.message });
    },
  });

  const { mutateAsync: removeTeamMember } = api.mailbox.members.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.members.list.invalidate();
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
      if (assignedConversationCount > 0) {
        if (!assignedTo) {
          toast.error("Please select a valid assignee");
          setLoading(false);
          return;
        }

        await bulkUpdate({
          conversationFilter: { assignee: [member.id] },
          assignedToAI: "ai" in assignedTo,
          assignedToId: "id" in assignedTo ? assignedTo.id : undefined,
          message: assignMessage,
        });
        await removeTeamMember({ id: member.id });

        toast.success("Member removed from the team", {
          description: `Conversations will be reassigned to ${"displayName" in assignedTo ? assignedTo.displayName : "Helper agent"}`,
        });
      } else {
        await removeTeamMember({ id: member.id });

        toast.success("Member removed from the team");
      }
    } catch (error) {
      setLoading(false);
      captureExceptionAndLog(error);
      toast.error("Something went wrong", { description: error instanceof Error ? error.message : "Unknown error" });
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

        {assignedConversationCount > 0 && (
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">Reassign {assignedConversationCount} tickets to</h4>

            <AssignSelect
              selectedUserId={assignedTo && "id" in assignedTo ? assignedTo.id : undefined}
              onChange={handleAssignSelectChange}
              aiOption
              aiOptionSelected={!!assignedTo && "ai" in assignedTo}
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
