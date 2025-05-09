"use client";

import { useUser } from "@clerk/nextjs";
import { Bot, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AssigneeOption, AssignSelect } from "@/components/assignSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useAssignTicket } from "./useAssignTicket";

export const AssignPopoverButton = ({
  initialAssignedToClerkId,
  assignedToAI = false,
}: {
  initialAssignedToClerkId: string | null;
  assignedToAI?: boolean;
}) => {
  const { assignTicket } = useAssignTicket();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const { data: orgMembers = [] } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const { user: currentUser } = useUser();

  const currentAssignee = orgMembers.find((m) => m.id === initialAssignedToClerkId) ?? null;

  useEffect(() => {
    setAssignedTo(assignedToAI ? { ai: true } : (orgMembers.find((m) => m.id === initialAssignedToClerkId) ?? null));
  }, [initialAssignedToClerkId, orgMembers, assignedToAI]);

  const toggleAssignModal = (open: boolean) => {
    setShowAssignModal(open);
    if (open) setAssignMessage("");
  };

  useKeyboardShortcut("a", () => {
    toggleAssignModal(true);
  });

  useKeyboardShortcut("i", () => {
    if (!currentUser) return;

    const selfAssignee = {
      id: currentUser.id,
      displayName: currentUser.fullName || currentUser.username || currentUser.id,
    };
    assignTicket(selfAssignee, null);
  });

  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(null);
  const [assignMessage, setAssignMessage] = useState<string>("");

  const handleAssignSelectChange = (assignee: AssigneeOption | null) => {
    setAssignedTo(assignee);
  };

  const handleAssignSubmit = () => {
    if (assignedTo && "ai" in assignedTo) {
      assignTicket({ ai: true }, assignMessage || null);
    } else {
      assignTicket(assignedTo, assignMessage || null);
    }
  };

  return (
    <>
      <Popover open={showAssignModal} onOpenChange={(isOpen) => toggleAssignModal(isOpen)}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 hover:underline",
              !currentAssignee && !assignedToAI && "text-muted-foreground",
            )}
          >
            {assignedToAI ? (
              <>
                <Bot className="h-4 w-4" />
                <span>Helper agent</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                {currentAssignee ? currentAssignee.displayName : "Unassigned"}
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">Assign conversation</h4>

            <AssignSelect
              selectedUserId={assignedTo && "id" in assignedTo ? assignedTo.id : null}
              onChange={handleAssignSelectChange}
              aiOption
              aiOptionSelected={!!(assignedTo && "ai" in assignedTo)}
            />

            <div className="grid gap-1">
              <Label htmlFor="assignMessage">Message</Label>
              <Textarea
                name="assignMessage"
                placeholder="Add an optional reason for assignment..."
                value={assignMessage}
                rows={3}
                onModEnter={() => handleAssignSubmit()}
                onChange={(e) => setAssignMessage(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleAssignSubmit}>
              Assign
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
