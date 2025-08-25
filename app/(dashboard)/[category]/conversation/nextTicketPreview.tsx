"use client";

import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useConversationListContext } from "@/app/(dashboard)/[category]/list/conversationListContext";
import HumanizedTime from "@/components/humanizedTime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/components/utils/initials";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export const NextTicketPreview = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { conversationListData, currentIndex, navigateToConversation } = useConversationListContext();
  const { data: mailboxPreferences } = api.mailbox.get.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNextTicketPreview = mailboxPreferences?.preferences?.showNextTicketPreview ?? false;

  if (!mounted || !conversationListData?.conversations || showNextTicketPreview === false) return null;

  const conversations = conversationListData.conversations;
  const nextConversation = conversations[currentIndex + 1] || conversations[0];

  if (conversations.length <= 1 || !nextConversation) return null;

  const isLastConversation = currentIndex === conversations.length - 1;

  const email = nextConversation.emailFrom || "Anonymous";
  const displayName = email.split("@")[0];
  const initials = getInitials(displayName || "Anonymous");

  return (
    <div className={cn("border rounded-lg bg-muted/30 shadow-sm", className)}>
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            aria-label={isCollapsed ? "Expand preview" : "Collapse preview"}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <h4 className="text-sm font-medium">
            {isLastConversation ? "First" : "Next"} Ticket:{" "}
            <span className="text-muted-foreground">#{nextConversation.id || "T-002"}</span>
          </h4>
          {isCollapsed && (
            <span className="text-xs text-muted-foreground truncate max-w-[250px] ml-2">
              {nextConversation.subject || "(no subject)"}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsNavigating(true);
            navigateToConversation(nextConversation.slug);
          }}
          disabled={isNavigating}
          className="text-xs px-2 py-1 h-auto hover:bg-primary/10"
        >
          {isNavigating ? "Switching..." : "Switch →"}
        </Button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-3 pt-2">
            <Avatar fallback={initials} size="sm" />

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{displayName}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
                {nextConversation.platformCustomer?.isVip && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    VIP
                  </Badge>
                )}
              </div>

              <h3 className="font-medium text-sm mt-1">{nextConversation.subject || "(no subject)"}</h3>

              {(nextConversation.recentMessageText || nextConversation.matchedMessageText) && (
                <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {nextConversation.matchedMessageText || nextConversation.recentMessageText || ""}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span>
                  Created <HumanizedTime time={nextConversation.createdAt} format="short" />
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span>
                  Updated <HumanizedTime time={nextConversation.updatedAt} format="short" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
