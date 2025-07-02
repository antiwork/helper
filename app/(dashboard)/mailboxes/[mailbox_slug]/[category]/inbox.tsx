"use client";

import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ReactNode, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useConversationQuery } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import Conversation from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversation";
import { List } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationList";
import {
  ConversationListContextProvider,
  useConversationListContext,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { TabBar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/tabBar";
import { useSaveLatestMailboxSlug } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/useSaveLatestMailboxSlug";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { useIsMobile } from "@/components/hooks/use-mobile";
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


const Inbox = () => {
  const params = useParams<{ mailbox_slug: string; category: Category }>();
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const mailboxSlug = params.mailbox_slug;
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
  const { data: currentConversation } = useConversationQuery(mailboxSlug, currentConversationSlug) ?? {};
  const pageTitle = currentConversation
    ? `${currentConversation.subject} - ${currentConversation.emailFrom}`
    : CATEGORY_LABELS[params.category];

  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  const currentConversationIndex =
    conversationListData?.conversations.findIndex((c) => c.slug === currentConversationSlug) ?? -1;
  const prefetchNextConversations = (prefetchCount: number) => {
    if (currentConversationIndex === -1) return;
    const nextConversations = conversationListData?.conversations.slice(
      currentConversationIndex + 1,
      currentConversationIndex + 1 + prefetchCount,
    );
    void Promise.all(
      (nextConversations ?? []).map((c) =>
        utils.mailbox.conversations.get.ensureData({ mailboxSlug, conversationSlug: c.slug }),
      ),
    );
  };
  useEffect(() => {
    if (!isPending) prefetchNextConversations(3);
  }, [isPending, currentConversationSlug]);

  useSaveLatestMailboxSlug(mailboxSlug);

  if (isMobile) {
    return (
      <div className="flex grow overflow-hidden">
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
  const mailboxSlug = useParams<{ mailbox_slug: string }>().mailbox_slug;
  const [conversationSlug] = useQueryState("id");

  return (
    <ConversationListContextProvider currentConversationSlug={conversationSlug}>
      <FileUploadProvider mailboxSlug={mailboxSlug} conversationSlug={conversationSlug ?? undefined}>
        {children}
      </FileUploadProvider>
    </ConversationListContextProvider>
  );
};

const Wrapper = () => (
  <InboxProvider>
    <Inbox />
  </InboxProvider>
);

export default Wrapper;
