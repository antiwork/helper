"use client";

import { ChevronDown, ChevronRight, ChevronUp, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { useConversationListContext } from "@/app/(dashboard)/[category]/list/conversationListContext";
import HumanizedTime from "@/components/humanizedTime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/components/utils/currency";
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
  const initials = getInitials(displayName);

  return (
    <div className={cn("border rounded-lg bg-muted/20", className)}>
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            aria-label={isCollapsed ? "Expand preview" : "Collapse preview"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <h4 className="text-sm font-medium text-muted-foreground">
            {isLastConversation ? "First" : "Next"} Ticket: #{nextConversation.id || "T-002"}
          </h4>
          {isCollapsed && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
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
          className="text-primary hover:text-primary-foreground"
        >
          {isNavigating ? "Switching..." : "Switch to"}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3 border-t">
          <div className="flex items-start gap-3 pt-3">
            <Avatar fallback={initials} size="md" />

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{displayName}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
                {nextConversation.platformCustomer?.isVip && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    VIP
                  </Badge>
                )}
                {nextConversation.platformCustomer?.value && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 flex items-center gap-0.5">
                    <DollarSign className="h-2.5 w-2.5" />
                    {formatCurrency(parseFloat(nextConversation.platformCustomer.value))}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-base">{nextConversation.subject || "(no subject)"}</h3>

              {(nextConversation.recentMessageText || nextConversation.matchedMessageText) && (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {(() => {
                    const text = nextConversation.matchedMessageText || nextConversation.recentMessageText;
                    return text.length > 150 ? `${text.slice(0, 150)}...` : text;
                  })()}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <span>
                  Created <HumanizedTime time={nextConversation.createdAt} format="long" />
                </span>
                <span>•</span>
                <span>
                  Updated <HumanizedTime time={nextConversation.updatedAt} format="long" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
