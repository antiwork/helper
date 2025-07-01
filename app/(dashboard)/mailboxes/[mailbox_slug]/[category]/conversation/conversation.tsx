import { useLayoutEffect, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import {
  ConversationContextProvider,
  useConversationContext,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import {
  type AttachedFile,
  type ConversationEvent,
  type Conversation as ConversationType,
  type Message,
  type Note,
} from "@/app/types/global";
import { Badge } from "@/components/ui/badge";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBreakpoint } from "@/components/useBreakpoint";
import type { serializeMessage } from "@/lib/data/conversationMessage";
import { conversationChannelId } from "@/lib/realtime/channels";
import { useRealtimeEvent } from "@/lib/realtime/hooks";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import ConversationSidebar from "./conversationSidebar";
import { CarouselPreviewContent } from "@/components/conversation/CarouselPreviewContent";
import { ConversationHeader } from "@/components/conversation/ConversationHeader";
import { ErrorContent } from "@/components/conversation/ErrorContent";
import { LoadingContent } from "@/components/conversation/LoadingContent";
import { MergedContent } from "@/components/conversation/MergedContent";
import { MessageActionsPanel } from "@/components/conversation/MessageActionsPanel";
import { MessageThreadPanel } from "@/components/conversation/MessageThreadPanel";

export type ConversationWithNewMessages = Omit<ConversationType, "messages"> & {
  messages: ((Message | Note | ConversationEvent) & { isNew?: boolean })[];
};

const ConversationContent = () => {
  const { mailboxSlug, conversationSlug, data: conversationInfo, isPending, error } = useConversationContext();
  useRealtimeEvent(conversationChannelId(mailboxSlug, conversationSlug), "conversation.updated", (event) => {
    utils.mailbox.conversations.get.setData({ mailboxSlug, conversationSlug }, (data) =>
      data ? { ...data, ...event.data } : null,
    );
  });
  useRealtimeEvent(conversationChannelId(mailboxSlug, conversationSlug), "conversation.message", (event) => {
    const message = { ...event.data, createdAt: new Date(event.data.createdAt) } as Awaited<
      ReturnType<typeof serializeMessage>
    >;
    utils.mailbox.conversations.get.setData({ mailboxSlug, conversationSlug }, (data) => {
      if (!data) return undefined;
      if (data.messages.some((m) => m.id === message.id)) return data;

      return { ...data, messages: [...data.messages, { ...message, isNew: true }] };
    });
    scrollToBottom({ animation: "smooth" });
  });

  const { input } = useConversationsListInput();

  const utils = api.useUtils();
  const conversationListInfo = utils.mailbox.conversations.list
    .getData(input)
    ?.conversations.find((c) => c.slug === conversationSlug);

  const [emailCopied, setEmailCopied] = useState(false);
  const copyEmailToClipboard = async () => {
    const email = conversationListInfo?.emailFrom || conversationInfo?.emailFrom;
    if (email) {
      await navigator.clipboard.writeText(email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const conversationMetadata = {
    emailFrom: (
      <div className="flex items-center gap-3">
        <Tooltip open>
          <TooltipTrigger asChild>
            <div
              onClick={copyEmailToClipboard}
              className="lg:text-base text-sm text-foreground responsive-break-words truncate cursor-pointer hover:text-primary"
            >
              {conversationListInfo?.emailFrom || conversationInfo?.emailFrom}
            </div>
          </TooltipTrigger>
          {emailCopied && <TooltipContent side="right">Copied!</TooltipContent>}
        </Tooltip>
        {(conversationListInfo?.conversationProvider || conversationInfo?.conversationProvider) === "helpscout" && (
          <Badge variant="dark">Help Scout</Badge>
        )}
        {conversationInfo?.customerMetadata?.isVip && (
          <Badge variant="bright" className="no-underline">
            VIP
          </Badge>
        )}
      </div>
    ),
    subject: (conversationListInfo?.subject || conversationInfo?.subject) ?? (isPending ? "" : "(no subject)"),
  };

  const [previewFileIndex, setPreviewFileIndex] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<AttachedFile[]>([]);

  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom({
    initial: "instant",
    resize: {
      damping: 0.3,
      stiffness: 0.05,
      mass: 0.7,
    },
  });

  useLayoutEffect(() => {
    scrollToBottom({ animation: "instant" });
  }, [contentRef]);

  const { isAboveSm } = useBreakpoint("sm");

  const defaultSize = Number(localStorage.getItem("conversationHeightRange") ?? 65);

  const [sidebarVisible, setSidebarVisible] = useState(isAboveSm);

  if (isAboveSm) {
    return (
      <ResizablePanelGroup direction="horizontal" className="relative flex w-full">
        <ResizablePanel defaultSize={75} minSize={50} maxSize={85}>
          <ResizablePanelGroup direction="vertical" className="flex w-full flex-col bg-background">
            <ResizablePanel
              minSize={20}
              defaultSize={defaultSize}
              maxSize={80}
              onResize={(size) => {
                localStorage.setItem("conversationHeightRange", Math.floor(size).toString());
              }}
            >
              <div className="flex flex-col h-full">
                <MergedContent />
                <CarouselPreviewContent
                  previewFileIndex={previewFileIndex}
                  setPreviewFileIndex={setPreviewFileIndex}
                  previewFiles={previewFiles}
                  setPreviewFiles={setPreviewFiles}
                />
                <ConversationHeader
                  conversationMetadata={conversationMetadata}
                  isAboveSm={isAboveSm}
                  sidebarVisible={sidebarVisible}
                  setSidebarVisible={setSidebarVisible}
                />
                <ErrorContent />
                <LoadingContent />
                {!error && !isPending && (
                  <MessageThreadPanel
                    scrollRef={scrollRef}
                    contentRef={contentRef}
                    setPreviewFileIndex={setPreviewFileIndex}
                    setPreviewFiles={setPreviewFiles}
                  />
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={100 - defaultSize} minSize={20}>
              <MessageActionsPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className={cn(!sidebarVisible && "hidden")} />

        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={50}
          className={cn("hidden lg:block", !sidebarVisible && "hidden!")}
        >
          {conversationInfo && sidebarVisible ? (
            <ConversationSidebar mailboxSlug={mailboxSlug} conversation={conversationInfo} />
          ) : null}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex flex-col h-full relative">
        <MergedContent />
        <CarouselPreviewContent
          previewFileIndex={previewFileIndex}
          setPreviewFileIndex={setPreviewFileIndex}
          previewFiles={previewFiles}
          setPreviewFiles={setPreviewFiles}
        />
        <ConversationHeader
          conversationMetadata={conversationMetadata}
          isAboveSm={isAboveSm}
          sidebarVisible={sidebarVisible}
          setSidebarVisible={setSidebarVisible}
        />
        <ErrorContent />
        <LoadingContent />
        {!error && !isPending && (
          <>
            <div className="grow overflow-hidden flex flex-col">
              <MessageThreadPanel
                scrollRef={scrollRef}
                contentRef={contentRef}
                setPreviewFileIndex={setPreviewFileIndex}
                setPreviewFiles={setPreviewFiles}
              />
            </div>
            <div className="max-h-[50vh] border-t border-border">
              <MessageActionsPanel />
            </div>
          </>
        )}
      </div>

      {conversationInfo && sidebarVisible ? (
        <div className="fixed z-20 inset-0 top-10">
          <ConversationSidebar mailboxSlug={mailboxSlug} conversation={conversationInfo} />
        </div>
      ) : null}
    </div>
  );
};

const Conversation = () => (
  <SidebarProvider>
    <ConversationContextProvider>
      <ConversationContent />
    </ConversationContextProvider>
  </SidebarProvider>
);

export default Conversation;
