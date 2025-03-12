"use client";

import { AblyProvider } from "ably/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ReactNode, useEffect } from "react";
import { CATEGORY_LABELS } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/categoryNav";
import {
  ConversationListContextProvider,
  useConversationListContext,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationListContext";
import { MobileList } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/mobileList";
import { useSaveLatestMailboxSlug } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/useSaveLatestMailboxSlug";
import { getGlobalAblyClient } from "@/components/ablyClient";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { useIsMobile } from "@/components/hooks/use-mobile";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const Conversation = dynamic(() => import("../../(inbox)/_components/conversation"), {
  loading: () => (
    <div className="h-full w-full rounded-md flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const Inbox = () => {
  const params = useParams<{ mailbox_slug: string; category: keyof typeof CATEGORY_LABELS }>();
  const mailboxSlug = params.mailbox_slug;
  const { currentConversationSlug, conversationListData, isPending } = useConversationListContext();
  const utils = api.useUtils();
  const isMobile = useIsMobile();

  const currentConversation = conversationListData?.conversations.find((c) => c.slug === currentConversationSlug);
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
        {pageTitle ? <title>{pageTitle}</title> : null}
        <div className={cn("w-full", currentConversationSlug ? "hidden" : "block")}>
          <MobileList />
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
    <div className="flex grow overflow-hidden">
      {pageTitle ? <title>{pageTitle}</title> : null}
      {currentConversationSlug ? (
        <Conversation key={currentConversationSlug} />
      ) : (
        <div className="mx-auto hidden items-center lg:flex">
          {isPending ? (
            <LoadingSpinner size="lg" />
          ) : conversationListData?.hasGmailSupportEmail ? (
            <span className="text-muted-foreground">New conversations will show up here!</span>
          ) : (
            <div className="mx-auto flex flex-col items-center gap-4 text-center text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">Connect your Gmail account</h2>
              <p>Connect your Gmail account to start managing your conversations in Helper</p>
              <Link href={`/mailboxes/${mailboxSlug}/settings?tab=integrations`}>
                <Button>Connect Gmail</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const InboxProvider = ({ children }: { children: ReactNode }) => {
  const mailboxSlug = useParams<{ mailbox_slug: string }>().mailbox_slug;
  const [conversationSlug] = useQueryState("id");

  return (
    <AblyProvider client={getGlobalAblyClient(mailboxSlug)}>
      <ConversationListContextProvider currentConversationSlug={conversationSlug}>
        <FileUploadProvider mailboxSlug={mailboxSlug} conversationSlug={conversationSlug ?? undefined}>
          {children}
        </FileUploadProvider>
      </ConversationListContextProvider>
    </AblyProvider>
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
