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
      })) || []),
    ],
  },
];
