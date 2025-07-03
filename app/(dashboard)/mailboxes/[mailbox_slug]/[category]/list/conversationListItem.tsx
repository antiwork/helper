import { escape } from "lodash-es";
import { Archive, Bot, CornerUpLeft, ShieldAlert, User, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { ConversationListItem as ConversationListItemType } from "@/app/types/global";
import { AssigneeOption, AssignSelect } from "@/components/assignSelect";
import { useToast } from "@/components/hooks/use-toast";
import HumanizedTime from "@/components/humanizedTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToastAction } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/components/utils/currency";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import { useConversationListContext } from "./conversationListContext";
import { highlightKeywords } from "./filters/highlightKeywords";

type ListItem = ConversationListItemType & { isNew?: boolean };

type ConversationListItemProps = {
  conversation: ListItem;
  isActive: boolean;
  onSelectConversation: (slug: string) => void;
  isSelected: boolean;
  onToggleSelect: (isSelected: boolean, shiftKey: boolean) => void;
};

export const ConversationListItem = ({
  conversation,
  isActive,
  onSelectConversation,
  isSelected,
  onToggleSelect,
}: ConversationListItemProps) => {
  const listItemRef = useRef<HTMLAnchorElement>(null);
  const { mailboxSlug } = useConversationListContext();
  const { category } = useParams<{ category: string }>();
  const { searchParams } = useConversationsListInput();
  const searchTerms = searchParams.search ? searchParams.search.split(/\s+/).filter(Boolean) : [];
  const { toast } = useToast();
  const utils = api.useUtils();
  const [showAssignPopover, setShowAssignPopover] = useState(false);
  const [assignedTo, setAssignedTo] = useState<AssigneeOption | null>(null);

  const { mutate: updateStatus, isPending: isUpdating } = api.mailbox.conversations.update.useMutation();
  const { mutate: updateAssignment, isPending: isAssigning } = api.mailbox.conversations.update.useMutation();

  const handleUpdateStatus = (e: React.MouseEvent, newStatus: "open" | "closed" | "spam") => {
    e.stopPropagation();
    const previousStatus = conversation.status;
    
    updateStatus(
      {
        mailboxSlug,
        conversationSlug: conversation.slug,
        status: newStatus,
      },
      {
        onSuccess: (data, variables) => {
          void utils.mailbox.conversations.list.invalidate();
          void utils.mailbox.conversations.count.invalidate();

          const { status } = variables;

          if (status === "spam") {
            toast({
              title: "Marked as spam",
              action: (
                <ToastAction
                  altText="Undo"
                  onClick={() => {
                    updateStatus(
                      {
                        mailboxSlug,
                        conversationSlug: conversation.slug,
                        status: previousStatus ?? "open",
                      },
                      {
                        onSuccess: () => {
                          void utils.mailbox.conversations.list.invalidate();
                          void utils.mailbox.conversations.count.invalidate();
                          toast({
                            title: "No longer marked as spam",
                          });
                        },
                        onError: () => {
                          toast({ title: "Failed to undo spam", variant: "destructive" });
                        }
                      },
                    );
                  }}
                >
                  Undo
                </ToastAction>
              ),
            });
          } else {
            let title = "";
            if (status === "open") {
              title = "Conversation reopened";
            } else if (status === "closed") {
              title = "Conversation closed";
            }
            if (title) {
              toast({
                title,
                variant: "success",
              });
            }
          }
        },
        onError: () => {
          const actionText = newStatus === "open" ? "reopen" : newStatus === "closed" ? "close" : "mark as spam";
          toast({ title: `Failed to ${actionText} conversation`, variant: "destructive" });
        }
      }
    );
  };

  const handleAssign = () => {
    if (!assignedTo) return;
    
    const assignedToId = "id" in assignedTo ? assignedTo.id : null;
    const assignedToAI = "ai" in assignedTo;

    updateAssignment(
      {
        mailboxSlug,
        conversationSlug: conversation.slug,
        assignedToId,
        assignedToAI,
      },
      {
        onSuccess: () => {
          void utils.mailbox.conversations.list.invalidate();
          setShowAssignPopover(false);
          setAssignedTo(null);
          const assignText = assignedToAI 
            ? "assigned to Helper agent" 
            : assignedToId 
              ? `assigned to ${assignedTo.displayName}`
              : "unassigned";
          toast({
            title: `Conversation ${assignText}`,
            variant: "success",
          });
        },
        onError: () => {
          toast({ title: "Failed to assign conversation", variant: "destructive" });
        }
      }
    );
  };

  useEffect(() => {
    if (isActive && listItemRef.current) {
      scrollIntoView(listItemRef.current, {
        block: "nearest",
        scrollMode: "if-needed",
        behavior: "smooth",
      });
    }
  }, [conversation, isActive]);

  let highlightedSubject = escape(conversation.subject);
  let highlightedBody = escape(conversation.matchedMessageText ?? conversation.recentMessageText ?? "");
  if (searchTerms.length > 0) {
    highlightedSubject = highlightKeywords(highlightedSubject, searchTerms);
    if (conversation.matchedMessageText) {
      highlightedBody = highlightKeywords(highlightedBody, searchTerms);
    }
  }

  const actionButtons: Record<"close" | "spam" | "reopen" | "assign", React.ReactNode> = {
    close: (
      <TooltipProvider key="close" delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => handleUpdateStatus(e, "closed")}
              disabled={isUpdating}
              className="rounded-md p-1 hover:bg-muted"
            >
              <Archive className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Close</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    spam: (
      <TooltipProvider key="spam" delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => handleUpdateStatus(e, "spam")}
              disabled={isUpdating}
              className="rounded-md p-1 hover:bg-muted"
            >
              <ShieldAlert className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Mark as spam</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    reopen: (
      <TooltipProvider key="reopen" delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => handleUpdateStatus(e, "open")}
              disabled={isUpdating}
              className="rounded-md p-1 hover:bg-muted"
            >
              <CornerUpLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reopen</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    assign: (
      <Popover key="assign" open={showAssignPopover} onOpenChange={setShowAssignPopover}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            disabled={isAssigning}
            className="rounded-md p-1 hover:bg-muted"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" side="top">
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">Assign conversation</h4>
            <AssignSelect
              selectedUserId={assignedTo && "id" in assignedTo ? assignedTo.id : null}
              onChange={setAssignedTo}
              aiOption
              aiOptionSelected={!!(assignedTo && "ai" in assignedTo)}
            />
            <Button 
              className="w-full" 
              onClick={handleAssign}
              disabled={!assignedTo || isAssigning}
              size="sm"
            >
              Assign
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    ),
  };

  return (
    <div className="group relative border-b border-border px-1 md:px-2">
      <div
        className={cn(
          "flex w-full cursor-pointer flex-col  transition-colors py-3 md:py-4",
          isActive
            ? "bg-amber-50 dark:bg-white/5 border-l-4 border-l-amber-400"
            : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
        )}
      >
        <div className="flex items-start gap-4 px-2 md:px-4">
          <div className="w-5 flex items-center">
            <Checkbox
              checked={isSelected}
              onClick={(event) => onToggleSelect(!isSelected, event.nativeEvent.shiftKey)}
              className="mt-1"
            />
          </div>
          <a
            ref={listItemRef}
            className="flex-1 min-w-0"
            href={`/mailboxes/${mailboxSlug}/conversations?id=${conversation.slug}`}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onSelectConversation(conversation.slug);
              }
            }}
            style={{ overflowAnchor: "none" }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground truncate text-xs md:text-sm">
                    {conversation.emailFrom ?? "Anonymous"}
                  </p>
                  {conversation.platformCustomer?.value &&
                    (conversation.platformCustomer.isVip ? (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="bright" className="gap-1 text-xs">
                              {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            VIP
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="gray" className="gap-1 text-xs">
                        {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {(conversation.assignedToId || conversation.assignedToAI) && (
                    <AssignedToLabel
                      className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs"
                      assignedToId={conversation.assignedToId}
                      assignedToAI={conversation.assignedToAI}
                    />
                  )}
                  <div className="text-muted-foreground text-[10px] md:text-xs">
                    {conversation.status === "closed" ? (
                      <HumanizedTime time={conversation.closedAt ?? conversation.updatedAt} titlePrefix="Closed on" />
                    ) : (
                      <HumanizedTime
                        time={conversation.lastUserEmailCreatedAt ?? conversation.updatedAt}
                        titlePrefix="Last email received on"
                      />
                    )}
                  </div>
                  {conversation.isNew && <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-blue-500" />}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p
                  className="font-medium text-foreground text-sm md:text-base"
                  dangerouslySetInnerHTML={{ __html: highlightedSubject }}
                />
                {highlightedBody && (
                  <p
                    className="text-muted-foreground truncate max-w-4xl text-xs md:text-sm"
                    dangerouslySetInnerHTML={{ __html: highlightedBody }}
                  />
                )}
              </div>
            </div>
          </a>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 p-2 md:absolute md:right-4 md:bottom-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 md:rounded-md md:border md:bg-background md:p-1">
        {(conversation.status === "closed" || conversation.status === "spam") && actionButtons.reopen}
        {conversation.status !== "closed" && actionButtons.close}
        {conversation.status !== "spam" && actionButtons.spam}
        {actionButtons.assign}
      </div>
    </div>
  );
};

const AssignedToLabel = ({
  assignedToId,
  assignedToAI,
  className,
}: {
  assignedToId: string | null;
  assignedToAI?: boolean;
  className?: string;
}) => {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (assignedToAI) {
    return (
      <div className={className} title="Assigned to Helper agent">
        <Bot className="h-3 w-3" />
      </div>
    );
  }

  const displayName = members?.find((m) => m.id === assignedToId)?.displayName?.split(" ")[0];

  return displayName ? (
    <div className={className} title={`Assigned to ${displayName}`}>
      <User className="h-3 w-3" />
      {displayName}
    </div>
  ) : null;
};
