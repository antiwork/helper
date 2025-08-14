"use client";

import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import HumanizedTime from "@/components/humanizedTime";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";
import { useConversationListContext } from "../list/conversationListContext";

type NextTicketPreviewProps = {
  nextTicket: RouterOutputs["mailbox"]["conversations"]["list"]["conversations"][0] | null;
  className?: string;
};

export const NextTicketPreview = ({ nextTicket, className }: NextTicketPreviewProps) => {
  const { moveToNextConversation } = useConversationListContext();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!nextTicket) {
    return null;
  }

  const getCustomerName = () => {
    return nextTicket.emailFrom || "Anonymous";
  };

  const getAvatarFallback = () => {
    return nextTicket.emailFrom ?? "?";
  };

  const handleToggleExpanded = (e: React.MouseEvent) => {
    // Don't toggle if clicking on the Switch to button
    if ((e.target as HTMLElement).closest("button[data-switch-to]")) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("border border-border rounded-lg bg-muted/30", className)}>
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isExpanded && "rotate-[-90deg]")} />
          <span>Next Ticket:</span>
          <span className="font-normal">#{nextTicket.id}</span>
        </div>
        <Button
          variant="link"
          onClick={moveToNextConversation}
          data-switch-to
          className="text-xs p-0 h-auto text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
        >
          Switch to
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="p-3 border-t border-border">
          <div className="flex items-start gap-3">
            <Avatar fallback={getAvatarFallback()} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "font-semibold text-sm truncate",
                    nextTicket.emailFrom ? "text-foreground" : "text-muted-foreground",
                  )}
                  title={getCustomerName()}
                >
                  {getCustomerName()}
                </span>
                <div className="text-xs text-muted-foreground">{nextTicket.emailFrom || "no-email@example.com"}</div>
                {nextTicket.status && nextTicket.status !== "open" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {nextTicket.status}
                  </span>
                )}
              </div>

              <div className="font-medium text-sm text-foreground line-clamp-2 mb-2">
                {nextTicket.subject || "(no subject)"}
              </div>

              {(nextTicket.recentMessageText || nextTicket.matchedMessageText) && (
                <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {nextTicket.matchedMessageText || nextTicket.recentMessageText}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {isMounted && (
                    <>
                      <span>
                        Created <HumanizedTime time={nextTicket.createdAt} />
                      </span>
                      <span>•</span>
                      <span>
                        Updated <HumanizedTime time={nextTicket.updatedAt} />
                      </span>
                    </>
                  )}
                </div>

                <div className="flex gap-1 flex-wrap">
                  {nextTicket.assignedToAI && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                      AI
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
