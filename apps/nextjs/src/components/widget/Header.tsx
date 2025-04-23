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
};

const NewChatIcon = React.memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
    <path d="M8 12H16M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
));

const Header = React.memo(function Header({
  config,
  isGumroadTheme,
  isAnonymous,
  onShowPreviousConversations,
  onNewConversation,
  isWhitelabel,
}: Props) {
  const logoSrc = isGumroadTheme || config.mailbox_slug === "flexile" ? `/${config.mailbox_slug}-logo.svg` : null;

  return (
    <div className="flex items-start justify-between border-b border-black p-4">
      <div className="flex items-center">
        {logoSrc && <Image src={logoSrc} alt={config.mailbox_slug} width="40" height="40" className="h-10 w-10" />}

        <div className="ml-2 flex flex-col gap-0.5">
          <h2 className="text-lg font-medium leading-5 text-black">{config.title || "Helper"}</h2>
          {!isWhitelabel && (
            <p className="flex items-center text-sm text-zinc-500">
              Powered by&nbsp;
              <a href="https://helper.ai" target="_blank" className="flex items-center">
                <Image src="/logo.svg" alt="Helper" width="110" height="32" className="w-12" />
              </a>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-black hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
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
                  className="text-black hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
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
                className="text-black hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
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
