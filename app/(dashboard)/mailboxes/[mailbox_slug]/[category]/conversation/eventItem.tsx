import { upperFirst } from "lodash-es";
import {
  AlertCircle,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";
import { useState } from "react";
import { ConversationEvent } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { api } from "@/trpc/react";

const eventDescriptions = {
  resolved_by_ai: "AI resolution",
  request_human_support: "Human support requested",
};
const hasEventDescription = (eventType: ConversationEvent["eventType"]): eventType is keyof typeof eventDescriptions =>
  eventType in eventDescriptions;

const statusVerbs = {
  open: "opened",
  closed: "closed",
  spam: "marked as spam",
};

const statusIcons = {
  open: ArrowRightFromLine,
  closed: ArrowLeftFromLine,
  spam: AlertCircle,
};

export const EventItem = ({ event }: { event: ConversationEvent }) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const { data: orgMembers } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const getUserDisplayName = (userId: string | null | undefined): string | null => {
    if (!userId) return null;
    const member = orgMembers?.find((m) => m.id === userId);
    return member?.displayName || null;
  };

  if (!event.changes) return null;

  const assignedToUserName = getUserDisplayName(event.changes.assignedToId);

  const description = hasEventDescription(event.eventType)
    ? eventDescriptions[event.eventType]
    : [
        event.changes.status ? statusVerbs[event.changes.status] : null,
        !event.changes.assignedToAI && event.changes.assignedToId !== undefined
          ? assignedToUserName
            ? `assigned to ${assignedToUserName}`
            : event.changes.assignedToId === null
              ? "unassigned"
              : "assigned to unknown user"
          : null,
        event.changes.assignedToAI ? "assigned to Helper agent" : null,
        event.changes.assignedToAI === false ? "unassigned Helper agent" : null,
      ]
        .filter(Boolean)
        .join(" and ");

  const hasDetails = event.byUserId || event.reason;
  const byUserName = getUserDisplayName(event.byUserId);

  const Icon =
    event.eventType === "resolved_by_ai"
      ? CheckCircle
      : event.changes.assignedToAI
        ? Bot
        : event.changes.status
          ? statusIcons[event.changes.status]
          : User;

  return (
    <div className="flex flex-col mx-auto">
      <button
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setDetailsExpanded(!detailsExpanded)}
      >
        {hasDetails && (detailsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        <Icon className="h-4 w-4" />
        <span className="flex items-center gap-1">{upperFirst(description)}</span>
        <span>·</span>
        <span>
          <HumanizedTime time={event.createdAt} />
        </span>
      </button>

      {hasDetails && detailsExpanded && (
        <div className="mt-2 text-sm text-muted-foreground border rounded p-4">
          <div className="flex flex-col gap-1">
            {byUserName && (
              <div>
                <strong>By:</strong> {byUserName}
              </div>
            )}
            {event.reason && (
              <div>
                <strong>Reason:</strong> {event.reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
