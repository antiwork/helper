import { escape } from "lodash-es";
import { Bot, User } from "lucide-react";
import { ConversationListItem as ConversationListItemType } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMembers } from "@/components/useMembers";
import { formatCurrency } from "@/components/utils/currency";
import { createSearchSnippet } from "@/lib/search/searchSnippet";
import { useConversationsListInput } from "../shared/queries";
import { highlightKeywords } from "./filters/highlightKeywords";
import { UnreadIndicator } from "./unreadIndicator";

type ListItem = ConversationListItemType & { isNew?: boolean };

type ConversationListItemProps = {
  conversation: ListItem;
  onSelectConversation: (slug: string) => void;
  isSelected: boolean;
  onToggleSelect: (isSelected: boolean, shiftKey: boolean) => void;
};

export const ConversationListItem = ({
  conversation,
  onSelectConversation,
  isSelected,
  onToggleSelect,
}: ConversationListItemProps) => {
  return (
    <div className="px-1 md:px-2">
      <div className="flex w-full cursor-pointer flex-col  transition-colors border-b border-border py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
        <div className="flex items-start gap-4 px-2 md:px-4">
          <div className="w-5 flex items-center">
            <Checkbox
              checked={isSelected}
              onClick={(event) => onToggleSelect(!isSelected, event.nativeEvent.shiftKey)}
              className="mt-1"
            />
          </div>
          <a
            className="flex-1 min-w-0"
            href={`/conversations?id=${conversation.slug}`}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onSelectConversation(conversation.slug);
              }
            }}
            style={{ overflowAnchor: "none" }}
          >
            <ConversationListItemContent conversation={conversation} />
          </a>
        </div>
      </div>
    </div>
  );
};

type ConversationListItemContentProps = {
  conversation: ListItem;
  emailPrefix?: string;
};

export const ConversationListItemContent = ({ conversation, emailPrefix }: ConversationListItemContentProps) => {
  const { searchParams, input } = useConversationsListInput();
  const searchTerms = searchParams.search ? searchParams.search.split(/\s+/).filter(Boolean) : [];

  let highlightedSubject = escape(conversation.subject);
  let bodyText = conversation.matchedMessageText ?? conversation.recentMessageText ?? "";

  if (searchTerms.length > 0 && conversation.matchedMessageText) {
    bodyText = createSearchSnippet(bodyText, searchTerms);
  }

  let highlightedBody = escape(bodyText);

  if (searchTerms.length > 0) {
    highlightedSubject = highlightKeywords(highlightedSubject, searchTerms);

    if (conversation.matchedMessageText) {
      highlightedBody = highlightKeywords(highlightedBody, searchTerms);
    }
  }

  const displayEmailFrom = `${emailPrefix ?? ""}${conversation.emailFrom ?? "Anonymous"}`;

  return (
    <div className="flex flex-col gap-2" data-testid="conversation-list-item-content">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground truncate text-xs md:text-sm">{displayEmailFrom}</p>
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
          {input.displayUnreadBehavior && <UnreadIndicator hasUnread={!!conversation.unreadMessageCount} />}
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
                time={conversation.lastMessageAt ?? conversation.updatedAt}
                titlePrefix="Last message on"
              />
            )}
          </div>
          {conversation.isNew && <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-blue-500" />}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p
          className="font-medium text-foreground text-sm md:text-base"
          dangerouslySetInnerHTML={{ __html: highlightedSubject ?? "(no subject)" }}
        />
        {highlightedBody && (
          <p
            className="text-muted-foreground max-w-4xl text-xs md:text-sm truncate"
            dangerouslySetInnerHTML={{ __html: highlightedBody }}
          />
        )}
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
  const { data: members } = useMembers();

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
