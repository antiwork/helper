import { ArrowRightFromLine, History } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { closeWidget } from "@/lib/widget/messages";
import { HelperWidgetConfig } from "@/sdk/types";

type Props = {
  config: HelperWidgetConfig;
  isGumroadTheme: boolean;
  isAnonymous: boolean;
  onShowPreviousConversations: () => void;
  onNewConversation: () => void;
  isWhitelabel: boolean;
  defaultTitle: string | null;
};

const NewChatIcon = React.memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
    <path d="M8 12H16M12 8V16" strokeWidth="2" strokeLinecap="round" style={{ stroke: "var(--background)" }} />
  </svg>
));

const Header = React.memo(function Header({
  config,
  isGumroadTheme,
  isAnonymous,
  onShowPreviousConversations,
  onNewConversation,
  isWhitelabel,
  defaultTitle,
}: Props) {
  return (
    <div className="flex items-start justify-between border-b border-black p-2">
      <div className="flex items-center h-full">
        <div className="ml-2 flex flex-col gap-0.5">
          <h2 className="text-lg font-medium leading-5 text-foreground">{config.title || defaultTitle || "Helper"}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted"
                onClick={onNewConversation}
                aria-label="Start new conversation"
              >
                <NewChatIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent>New conversation</TooltipContent>
          </Tooltip>
          {!isAnonymous && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted"
                  onClick={onShowPreviousConversations}
                  aria-label="Show previous conversations"
                >
                  <History className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>History</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted"
                onClick={() => closeWidget()}
                aria-label="Close chat"
              >
                <ArrowRightFromLine className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Close chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export default Header;
