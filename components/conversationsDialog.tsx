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
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "./hooks/use-toast";
import { api } from "@/trpc/react";

interface ConversationsDialogProps {
  children: React.ReactNode;
  assignedToId: string;
  mailboxSlug: string;
  description?: string;
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
  assignedToId
}: ConversationsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(null);
  const [assignMessage, setAssignMessage] = useState<string>("");

  const { data: count } = api.mailbox.conversations.count.useQuery({ mailboxSlug, assignee: [assignedToId] });

  const { mutateAsync: reassignAllConversations, isPending: isUpdating } = api.mailbox.conversations.reassignAll.useMutation({
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating conversation",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      utils.mailbox.conversations.count.invalidate({ mailboxSlug, assignee: [assignedToId] });
    }
  });

  const handleAssignSelectChange = (assignee: AssigneeOption | null) => {
    setAssignedTo(assignee);
  };

  const handleAssignSubmit = () => {
    if (!assignedTo || !("id" in assignedTo)) {
      toast({
        variant: "destructive",
        title: "Please select a valid assignee",
      });
      return;
    }
    reassignAllConversations({
      mailboxSlug,
      conversationSlug: "", 
      previousAssigneeId: assignedToId,
      newAssigneeId: assignedTo.id,
    });
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
          <h4 className="font-medium">Assign conversation {count?.total ? `(${count?.total})` : ""}</h4>

          <AssignSelect
            selectedUserId={assignedToId}
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

        <Button onClick={handleAssignSubmit} variant="destructive">
          Reassign and delete member
        </Button>
      </DialogContent>
    </Dialog>
  );
}
