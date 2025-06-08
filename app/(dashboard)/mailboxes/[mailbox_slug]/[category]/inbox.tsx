"use client";

import { ArrowRight, Check, Circle } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ReactNode, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useConversationQuery } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { HandHello } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/icons/handHello";
import {
  ConversationListContextProvider,
  useConversationListContext,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { MobileList } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/mobileList";
import { useConversationsListInput } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/shared/queries";
import { TabBar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/tabBar";
import { useSaveLatestMailboxSlug } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/useSaveLatestMailboxSlug";
import { CATEGORY_LABELS } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/categoryNav";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { useIsMobile } from "@/components/hooks/use-mobile";
import LoadingSpinner from "@/components/loadingSpinner";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { InboxZero } from "./icons/inboxZero";

const Conversation = dynamic(() => import("./conversation/conversation"), {
  loading: () => (
    <div className="h-full w-full rounded-md flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const Inbox = () => {
  const params = useParams<{ mailbox_slug: string; category: keyof typeof CATEGORY_LABELS }>();
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const mailboxSlug = params.mailbox_slug;
  const { input } = useConversationsListInput();
  const { currentConversationSlug, conversationListData, isPending } = useConversationListContext();
  const utils = api.useUtils();
  const isMobile = useIsMobile();
  const { data: currentConversation } = useConversationQuery(mailboxSlug, currentConversationSlug) ?? {};
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

  const isOnboarding =
    !conversationListData?.onboardingState.hasResend ||
    !conversationListData?.onboardingState.hasWidgetHost ||
    !conversationListData?.onboardingState.hasGmailSupportEmail;

  return (
    <div className={cn("relative flex grow overflow-hidden", isStandalone ? "pt-10" : "")}>
      {pageTitle ? <title>{pageTitle}</title> : null}
      <TabBar />
      {currentConversationSlug ? (
        <Conversation key={currentConversationSlug} />
      ) : (
        <div className="mx-auto hidden items-center lg:flex">
          {isPending ? (
            <LoadingSpinner size="lg" />
          ) : isOnboarding ? (
            <div className="mx-auto flex flex-col items-center gap-6 text-muted-foreground">
              <HandHello className="w-36 h-36 -mb-10" />
              <h2 className="text-xl text-center font-semibold text-foreground">Welcome! Let's complete your setup.</h2>
              <div className="grid gap-2">
                <Link
                  href={`/mailboxes/${mailboxSlug}/settings?tab=in-app-chat`}
                  className="border transition-colors hover:border-foreground rounded-lg p-4"
                >
                  <div className="flex items-center gap-2">
                    {conversationListData?.onboardingState.hasWidgetHost ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <p className={cn(conversationListData?.onboardingState.hasWidgetHost && "line-through")}>
                      Add the chat widget to your website
                    </p>
                  </div>
                  {!conversationListData?.onboardingState.hasWidgetHost && (
                    <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                      Learn how <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Link>
                <Link
                  href="https://helper.ai/docs/integrations#resend"
                  target="_blank"
                  className="border transition-colors hover:border-foreground rounded-lg p-4"
                >
                  <div className="flex items-center gap-2">
                    {conversationListData?.onboardingState.hasResend ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <p className={cn(conversationListData?.onboardingState.hasResend && "line-through")}>
                      Set up Resend to send emails from Helper
                    </p>
                  </div>
                  {!conversationListData?.onboardingState.hasResend && (
                    <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                      Learn how <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Link>
                <Link
                  href="https://helper.ai/docs/integrations#gmail"
                  className="border transition-colors hover:border-foreground rounded-lg p-4"
                >
                  <div className="flex items-center gap-2">
                    {conversationListData?.onboardingState.hasGmailSupportEmail ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <p className={cn(conversationListData?.onboardingState.hasGmailSupportEmail && "line-through")}>
                      Connect Gmail to handle your incoming emails
                    </p>
                  </div>
                  {!conversationListData?.onboardingState.hasGmailSupportEmail && (
                    <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                      Learn how <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Link>
              </div>
            </div>
          ) : input.status?.[0] === "open" ? (
            <div className="flex flex-col items-center">
              <InboxZero className="h-60 w-60 dark:text-bright" />
              <h2 className="font-semibold mb-2">No open tickets</h2>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <h2 className="font-semibold mb-2">No tickets found</h2>
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
    <ConversationListContextProvider currentConversationSlug={conversationSlug}>
      <FileUploadProvider mailboxSlug={mailboxSlug} conversationSlug={conversationSlug ?? undefined}>
        {children}
      </FileUploadProvider>
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
