"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ReactNode, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useConversationQuery } from "@/app/(dashboard)/(mailbox)/[category]/conversation/conversationContext";
import { List } from "@/app/(dashboard)/(mailbox)/[category]/list/conversationList";
import {
  ConversationListContextProvider,
  useConversationListContext,
} from "@/app/(dashboard)/(mailbox)/[category]/list/conversationListContext";
import { TabBar } from "@/app/(dashboard)/(mailbox)/[category]/tabBar";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { useIsMobile } from "@/components/hooks/use-mobile";
import LoadingSpinner from "@/components/loadingSpinner";
import { PageHeader } from "@/components/pageHeader";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const CATEGORY_LABELS = {
  all: "All",
  mine: "Mine",
  assigned: "Assigned",
  unassigned: "Up for grabs",
} as const;

type Category = keyof typeof CATEGORY_LABELS;

const Conversation = dynamic(() => import("./conversation/conversation"), {
  loading: () => (
    <div className="h-full w-full rounded-md flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

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

  useKeyboardShortcut("j", moveToNextConversation);
  useKeyboardShortcut("k", moveToPreviousConversation);

  const utils = api.useUtils();
  const isMobile = useIsMobile();
  const { data: currentConversation } = useConversationQuery(currentConversationSlug) ?? {};
  const pageTitle = currentConversation
    ? `${currentConversation.subject} - ${currentConversation.emailFrom}`
    : CATEGORY_LABELS[params.category];

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
      <div className="flex grow overflow-hidden">
        {pageTitle ? <title>{pageTitle}</title> : null}
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
      {pageTitle ? <title>{pageTitle}</title> : null}
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

export const InboxProvider = ({ children }: { children: ReactNode }) => {
  const [conversationSlug] = useQueryState("id");

  return (
    <ConversationListContextProvider currentConversationSlug={conversationSlug}>
      <FileUploadProvider conversationSlug={conversationSlug ?? undefined}>{children}</FileUploadProvider>
    </ConversationListContextProvider>
  );
};

export const Wrapper = () => (
  <InboxProvider>
    <Inbox />
  </InboxProvider>
);

export default dynamic(() => Promise.resolve(Wrapper), {
  ssr: false,
});
