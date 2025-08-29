"use client";

import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ReactNode, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useMediaQuery } from "react-responsive";
import Conversation from "@/app/(dashboard)/[category]/conversation/conversation";
import { useConversationQuery } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { List } from "@/app/(dashboard)/[category]/list/conversationList";
import {
  ConversationListContextProvider,
  useConversationListContext,
} from "@/app/(dashboard)/[category]/list/conversationListContext";
import { TabBar } from "@/app/(dashboard)/[category]/tabBar";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { isInDialog } from "@/components/isInDialog";
import { PageHeader } from "@/components/pageHeader";
import { useDocumentTitle } from "@/components/useDocumentTitle";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const CATEGORY_LABELS = {
  all: "Open",
  mine: "Mine",
  assigned: "Assigned",
  unassigned: "Up for grabs",
} as const;

type Category = keyof typeof CATEGORY_LABELS;

const Inbox = () => {
  const params = useParams<{ category: Category }>();
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const {
    currentConversationSlug,
    conversationListData,
    isPending,
    moveToNextConversation,
    moveToPreviousConversation,
  } = useConversationListContext();

  useHotkeys("j", moveToNextConversation, {
    enabled: () => !isInDialog(),
  });

  useHotkeys("k", moveToPreviousConversation, {
    enabled: () => !isInDialog(),
  });

  const utils = api.useUtils();
  const isMobile = useIsMobile();
  const { data: currentConversation } = useConversationQuery(currentConversationSlug) ?? {};
  const pageTitle = currentConversation
    ? `${currentConversation.subject} - ${currentConversation.emailFrom ?? "Anonymous"}`
    : CATEGORY_LABELS[params.category];

  useDocumentTitle(pageTitle);

  const currentConversationIndex =
    conversationListData?.conversations.findIndex((c) => c.slug === currentConversationSlug) ?? -1;
  const prefetchNextConversations = (prefetchCount: number) => {
    if (currentConversationIndex === -1) return;
    const nextConversations = conversationListData?.conversations.slice(
      currentConversationIndex + 1,
      currentConversationIndex + 1 + prefetchCount,
    );
    void Promise.all(
      (nextConversations ?? []).map((c) => utils.mailbox.conversations.get.ensureData({ conversationSlug: c.slug })),
    );
  };
  useEffect(() => {
    if (!isPending) prefetchNextConversations(3);
  }, [isPending, currentConversationSlug]);

  if (isMobile) {
    return (
      <div className="flex grow">
        <div className={cn("w-full", currentConversationSlug ? "hidden" : "block")}>
          <PageHeader title={CATEGORY_LABELS[params.category]} />
          <List />
        </div>

        {currentConversationSlug && (
          <div className="absolute inset-0 z-10 bg-background">
            <Conversation key={currentConversationSlug} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full flex grow overflow-hidden", isStandalone ? "pt-10" : "")}>
      <TabBar />
      {currentConversationSlug ? (
        <Conversation key={currentConversationSlug} />
      ) : (
        <div className="flex-1 overflow-hidden">
          <List />
        </div>
      )}
    </div>
  );
};

const InboxProvider = ({ children }: { children: ReactNode }) => {
  const [conversationSlug] = useQueryState("id");

  return (
    <ConversationListContextProvider currentConversationSlug={conversationSlug}>
      <FileUploadProvider conversationSlug={conversationSlug ?? undefined}>{children}</FileUploadProvider>
    </ConversationListContextProvider>
  );
};

const Wrapper = () => (
  <InboxProvider>
    <Inbox />
  </InboxProvider>
);

export default Wrapper;
