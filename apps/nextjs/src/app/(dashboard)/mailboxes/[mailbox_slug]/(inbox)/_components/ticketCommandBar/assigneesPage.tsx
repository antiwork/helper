import { UserIcon } from "@heroicons/react/24/outline";
import { Bot } from "lucide-react";
import type { CommandGroup } from "./types";

type AssigneesPageProps = {
  orgMembers: { id: string; displayName: string }[] | undefined;
  currentUserId: string | undefined;
  onAssignTicket?: (assignedTo: { id: string; displayName: string } | { ai: true } | null) => void;
  onOpenChange: (open: boolean) => void;
};

export const useAssigneesPage = ({
  orgMembers,
  currentUserId,
  onAssignTicket,
  onOpenChange,
}: AssigneesPageProps): CommandGroup[] => [
  {
    heading: "Assignees",
    items: [
      {
        id: "unassign",
        label: "Unassign",
        icon: UserIcon,
        onSelect: () => {
          if (onAssignTicket) {
            onAssignTicket(null);
            onOpenChange(false);
          }
        },
        preview: (
          <div className="p-4">
            <h3 className="font-medium mb-2">Unassign Ticket</h3>
            <p className="text-sm text-muted-foreground">Remove the current assignee from this conversation.</p>
          </div>
        ),
      },
      {
        id: "helper-agent",
        label: "Helper agent",
        icon: Bot,
        onSelect: () => {
          if (onAssignTicket) {
            onAssignTicket({ ai: true });
            onOpenChange(false);
          }
        },
        preview: (
          <div className="p-4">
            <h3 className="font-medium mb-2">Assign to Helper agent</h3>
            <p className="text-sm text-muted-foreground">Assign this conversation to be handled by the Helper agent.</p>
          </div>
        ),
      },
      ...(orgMembers?.map((member) => ({
        id: member.id,
        label: `${member.displayName}${member.id === currentUserId ? " (You)" : ""}`,
        icon: UserIcon,
        onSelect: () => {
          if (onAssignTicket) {
            onAssignTicket(member);
            onOpenChange(false);
          }
        },
        preview: (
          <div className="p-4">
            <h3 className="font-medium mb-2">Assign to {member.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              Transfer ownership of this conversation to {member.displayName}.
            </p>
          </div>
        ),
      })) || []),
    ],
  },
];
