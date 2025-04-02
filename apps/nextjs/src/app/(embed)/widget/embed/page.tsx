"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import cx from "classnames";
import { domAnimation, LazyMotion, m } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
// import { AISteps } from "@/components/widget/ai-steps";
import Conversation from "@/components/widget/Conversation";
import { eventBus, messageQueue } from "@/components/widget/eventBus";
import Header from "@/components/widget/Header";
import HelpingHand from "@/components/widget/HelpingHand";
import { useReadPageTool } from "@/components/widget/hooks/useReadPageTool";
import PreviousConversations from "@/components/widget/PreviousConversations";
import { useWidgetView } from "@/components/widget/useWidgetView";
import { useScreenshotStore } from "@/components/widget/widgetState";
import { MESSAGE_TYPE, minimizeWidget, sendConversationUpdate, sendReadyMessage } from "@/lib/widget/messages";
import { HelperWidgetConfig } from "@/sdk/types";

const queryClient = new QueryClient();
const GUMROAD_MAILBOX_SLUG = "gumroad";

type GuideInstructions = {
  instructions: string;
  callId: string | null;
};

const steps = [
  {
    id: "1",
    description: "Navigate to the Discounts tab on the Checkout page.",
    status: "completed" as const,
    details: {
      function: "navigate_to",
      params: { path: "/checkout/discounts" },
    },
  },
  {
    id: "2",
    description: "Click 'New discount' button.",
    status: "completed" as const,
    details: {
      function: "click_element",
      params: { selector: "button[data-testid='new-discount-button']" },
    },
  },
  {
    id: "3",
    description: "Select 'All products' option.",
    status: "completed" as const,
    details: {
      function: "select_option",
      params: { name: "discount_scope", value: "all_products" },
    },
  },
  {
    id: "4",
    description: "Enter '50%' as the discount amount.",
    status: "loading" as const,
    details: {
      function: "input_text",
      params: { field: "discount_amount", value: "50%" },
    },
  },
];

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<HelperWidgetConfig | null>(null);
  const [currentURL, setCurrentURL] = useState<string | null>(null);
  const [selectedConversationSlug, setSelectedConversationSlug] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [pageHTML, setPageHTML] = useState<string | null>(null);
  const isGumroadTheme = config?.mailbox_slug === GUMROAD_MAILBOX_SLUG;
  const [isGuidingUser, setIsGuidingUser] = useState(false);
  const [guideInstructions, setGuideInstructions] = useState<GuideInstructions | null>(null);

  const { readPageToolCall } = useReadPageTool(token, config, pageHTML, currentURL);

  const {
    currentView,
    isNewConversation,
    setCurrentView,
    setIsNewConversation,
    handleSelectConversation,
    handleNewConversation,
  } = useWidgetView();

  const { setScreenshot } = useScreenshotStore();

  const onSelectConversation = (slug: string) => {
    setIsNewConversation(false);
    setSelectedConversationSlug(slug);
    handleSelectConversation(slug);
    sendConversationUpdate(slug);
  };

  const onShowPreviousConversations = useCallback(() => {
    setHasLoadedHistory(true);
    setCurrentView("previous");
  }, [setCurrentView]);

  const memoizedHandleNewConversation = useCallback(() => {
    handleNewConversation();
    sendConversationUpdate(null);
  }, [handleNewConversation]);

  useEffect(() => {
    if (isNewConversation) {
      setSelectedConversationSlug(null);
      sendConversationUpdate(null);
    }
  }, [isNewConversation]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !event.data || event.data.type !== MESSAGE_TYPE) return;

      const { action, content } = event.data.payload;

      if (action === "PROMPT") {
        if (eventBus.all.has("PROMPT")) {
          eventBus.emit("PROMPT", content as string);
        } else {
          messageQueue.push(content as string);
        }
      } else if (action === "START_GUIDE") {
        setGuideInstructions({ instructions: content as string, callId: null });
        setIsGuidingUser(true);
        minimizeWidget();
      } else if (action === "CONFIG") {
        setPageHTML(content.pageHTML);
        setCurrentURL(content.currentURL);
        setConfig(content.config);
        setToken(content.sessionToken);
      } else if (action === "OPEN_CONVERSATION") {
        const { conversationSlug } = content;
        onSelectConversation(conversationSlug);
      } else if (action === "SCREENSHOT") {
        setScreenshot({ response: content });
      }
    };

    window.addEventListener("message", handleMessage);
    sendReadyMessage();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const isAnonymous = !config?.email;

  if (!config || !token) {
    return <div />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={cx("flex h-screen w-full flex-col responsive-chat max-w-full sm:max-w-[520px]", {
          "bg-gumroad-bg": isGumroadTheme,
          "bg-white": !isGumroadTheme,
          hidden: isGuidingUser,
        })}
      >
        <Header
          config={config}
          isGumroadTheme={isGumroadTheme}
          onShowPreviousConversations={onShowPreviousConversations}
          onNewConversation={memoizedHandleNewConversation}
          isAnonymous={isAnonymous}
        />
        <div className="relative flex-1 overflow-hidden">
          <LazyMotion features={domAnimation}>
            <m.div
              className="absolute inset-0 flex"
              animate={currentView === "previous" ? "previous" : "chat"}
              variants={{ previous: { x: 0 }, chat: { x: "-100%" } }}
              transition={{ type: "tween", duration: 0.3 }}
            >
              <div className="flex-shrink-0 w-full h-full">
                <div className="h-full overflow-y-auto p-4">
                  {hasLoadedHistory && !isAnonymous && (
                    <PreviousConversations token={token} onSelectConversation={onSelectConversation} />
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 w-full h-full flex flex-col">
                <Conversation
                  token={token}
                  readPageTool={readPageToolCall}
                  isGumroadTheme={isGumroadTheme}
                  isNewConversation={isNewConversation}
                  selectedConversationSlug={selectedConversationSlug}
                  onLoadFailed={memoizedHandleNewConversation}
                  isAnonymous={isAnonymous}
                  guideInstructions={guideInstructions}
                  setIsGuidingUser={setIsGuidingUser}
                  setGuideInstructions={setGuideInstructions}
                />
              </div>
            </m.div>
          </LazyMotion>
        </div>
      </div>
      {isGuidingUser && guideInstructions && <HelpingHand guideInstructions={guideInstructions} token={token} />}
    </QueryClientProvider>
  );
}
