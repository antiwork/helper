import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import {
  ArrowUpIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  LinkIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ChannelProvider } from "ably/react";
import FileSaver from "file-saver";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useStickToBottom } from "use-stick-to-bottom";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  ConversationContextProvider,
  useConversationContext,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { MessageThread } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageThread";
import Viewers from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/viewers";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import PreviewModal from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/previewModal";
import { useLayoutInfo } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/useLayoutInfo";
import {
  DraftedEmail,
  type AttachedFile,
  type ConversationEvent,
  type Conversation as ConversationType,
  type Message,
  type Note,
} from "@/app/types/global";
import { CarouselDirection, createCarousel } from "@/components/carousel";
import LoadingSpinner from "@/components/loadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBreakpoint } from "@/components/useBreakpoint";
import { assertDefined } from "@/components/utils/assert";
import { conversationChannelId } from "@/lib/ably/channels";
import { useAblyEvent } from "@/lib/ably/hooks";
import type { serializeMessage } from "@/lib/data/conversationMessage";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import ConversationSidebar from "./conversationSidebar";
import { MessageActions } from "./messageActions";

export type ConversationWithNewMessages = Omit<ConversationType, "messages"> & {
  messages: ((Message | Note | ConversationEvent) & { isNew?: boolean })[];
};

const { Carousel, CarouselButton, CarouselContext } = createCarousel<AttachedFile>();

export const useUndoneEmailStore = create<{
  undoneEmail: DraftedEmail | undefined;
  setUndoneEmail: (undoneEmail: DraftedEmail | undefined) => void;
}>()(
  devtools(
    (set) => ({
      undoneEmail: undefined,
      setUndoneEmail: (undoneEmail) => set({ undoneEmail }),
    }),
    {
      name: "undone-email-store",
    },
  ),
);

const CopyLinkButton = () => {
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const [copied, setCopied] = useState(false);

  if (!isStandalone) return null;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={async (e) => {
            e.preventDefault();
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <LinkIcon className="h-4 w-4" />
          <span className="sr-only">Copy link</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
    </Tooltip>
  );
};

const ScrollToTopButton = ({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const scrollTop = scrollElement.scrollTop;
        const threshold = 100;

        // Show button whenever scrolled past threshold
        setShow(scrollTop > threshold);
      }, 100);
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollRef]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          className={cn(
            "absolute bottom-4 left-4 transition-all duration-200 h-8 w-8 p-0 rounded-full",
            "flex items-center justify-center",
            "bg-background border border-border shadow-xs",
            "hover:border-primary hover:shadow-md hover:bg-muted",
            show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
          )}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="h-4 w-4 text-foreground" />
        </a>
      </TooltipTrigger>
      <TooltipContent>Scroll to top</TooltipContent>
    </Tooltip>
  );
};

const MessageThreadPanel = ({
  scrollRef,
  contentRef,
  setPreviewFileIndex,
  setPreviewFiles,
  setLayoutState,
}: {
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
  contentRef: React.MutableRefObject<HTMLElement | null>;
  setPreviewFileIndex: (index: number) => void;
  setPreviewFiles: (files: AttachedFile[]) => void;
  setLayoutState: React.Dispatch<React.SetStateAction<{ listHidden: boolean }>>;
}) => {
  const { mailboxSlug, data: conversationInfo } = useConversationContext();

  return (
    <div className="grow overflow-y-auto relative" ref={scrollRef}>
      <div ref={contentRef as React.RefObject<HTMLDivElement>} className="relative">
        <ScrollToTopButton scrollRef={scrollRef} />
        <div className="flex flex-col gap-8 px-4 py-4 h-full">
          {conversationInfo && (
            <MessageThread
              mailboxSlug={mailboxSlug}
              conversation={conversationInfo}
              onPreviewAttachment={(message, currentIndex) => {
                setPreviewFileIndex(currentIndex);
                setPreviewFiles(message.files);
              }}
              onDoubleClickWhiteSpace={() => setLayoutState((state) => ({ ...state, listHidden: !state.listHidden }))}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const MessageActionsPanel = () => {
  return (
    <div
      className="h-full bg-muted px-4 pb-4"
      onKeyDown={(e) => {
        // Prevent keypress events from triggering the global inbox view keyboard shortcuts
        e.stopPropagation();
      }}
    >
      <MessageActions />
    </div>
  );
};

const ConversationHeader = ({
  conversationMetadata,
  isAboveSm,
  sidebarVisible,
  setSidebarVisible,
}: {
  conversationMetadata: any;
  isAboveSm: boolean;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}) => {
  const { mailboxSlug, data: conversationInfo } = useConversationContext();
  const { minimize } = useConversationListContext();

  return (
    <div
      className={cn("min-w-0 flex items-center gap-2 border-b border-border p-2 pl-4", !conversationInfo && "hidden")}
    >
      <div id="conversation-close" className="sm:hidden">
        <XMarkIcon
          aria-label="Minimize conversation"
          className="text-primary h-5 w-5 cursor-pointer"
          onClick={minimize}
        />
      </div>
      <div className="hidden sm:block">
        {conversationInfo?.source === "email" ? (
          <EnvelopeIcon className="w-4 h-4" />
        ) : (
          <ChatBubbleLeftIcon className="w-4 h-4" />
        )}
      </div>
      <div className="truncate text-sm sm:text-base">{conversationMetadata.subject ?? "(no subject)"}</div>
      <CopyLinkButton />
      <div className="flex-1" />
      {conversationInfo?.id && <Viewers mailboxSlug={mailboxSlug} conversationSlug={conversationInfo.slug} />}
      <Button
        variant={!isAboveSm && sidebarVisible ? "subtle" : "ghost"}
        size="sm"
        className="ml-4"
        iconOnly
        onClick={() => setSidebarVisible(!sidebarVisible)}
      >
        {isAboveSm ? (
          sidebarVisible ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )
        ) : (
          <InformationCircleIcon className="h-5 w-5" />
        )}
        <span className="sr-only">{sidebarVisible ? "Hide sidebar" : "Show sidebar"}</span>
      </Button>
    </div>
  );
};

const ErrorContent = () => {
  const { error, refetch } = useConversationContext();
  if (!error) return null;

  return (
    <div className="flex items-center justify-center grow">
      <Alert variant="destructive" className="max-w-lg text-center">
        <AlertTitle>Failed to load conversation</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          Error loading this conversation: {error.message}
          <Button variant="destructive_outlined" onClick={() => refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

const LoadingContent = () => {
  const { isPending } = useConversationContext();
  if (!isPending) return null;

  return (
    <div className="flex items-center justify-center grow">
      <LoadingSpinner size="md" />
    </div>
  );
};

const CarouselPreviewContent = ({
  previewFileIndex,
  setPreviewFileIndex,
  previewFiles,
  setPreviewFiles,
}: {
  previewFileIndex: number;
  setPreviewFileIndex: (index: number) => void;
  previewFiles: AttachedFile[];
  setPreviewFiles: (files: AttachedFile[]) => void;
}) => {
  return (
    <CarouselContext.Provider
      value={{
        currentIndex: previewFileIndex,
        setCurrentIndex: setPreviewFileIndex,
        items: previewFiles,
      }}
    >
      <Carousel>
        {(currentFile) => (
          <Dialog open={!!currentFile} onOpenChange={(open) => !open && setPreviewFiles([])}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>File Preview</DialogTitle>
              </DialogHeader>
              <div className="relative bottom-0.5 flex items-center justify-between p-3">
                <div className="max-w-xs truncate" title={currentFile.name}>
                  {currentFile.name}
                </div>

                <div className="mr-6 flex items-center">
                  <button onClick={() => FileSaver.saveAs(currentFile.presignedUrl, currentFile.name)}>
                    <ArrowDownTrayIcon className="text-primary h-5 w-5 shrink-0" />
                    <span className="sr-only">Download</span>
                  </button>
                </div>
              </div>

              <div className="relative flex flex-row items-center justify-center gap-3">
                <CarouselButton direction={CarouselDirection.LEFT} className="absolute -left-10 md:-left-11" />
                <PreviewModal file={currentFile} />
                <CarouselButton direction={CarouselDirection.RIGHT} className="absolute -right-10 md:-right-11" />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Carousel>
    </CarouselContext.Provider>
  );
};

const MergedContent = () => {
  const { mailboxSlug, data: conversationInfo } = useConversationContext();
  if (!conversationInfo?.mergedInto?.slug) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/75 flex flex-col items-center justify-center gap-4 h-full text-lg">
      Merged into another conversation.
      <Button variant="subtle" asChild>
        <Link href={`/mailboxes/${mailboxSlug}/conversations?id=${conversationInfo.mergedInto.slug}`}>View</Link>
      </Button>
    </div>
  );
};

const ConversationContent = () => {
  const { mailboxSlug, conversationSlug, data: conversationInfo, isPending, error } = useConversationContext();
  useAblyEvent(conversationChannelId(mailboxSlug, conversationSlug), "conversation.updated", (event) => {
    utils.mailbox.conversations.get.setData({ mailboxSlug, conversationSlug }, (data) =>
      data ? { ...data, ...event.data } : null,
    );
  });
  useAblyEvent(conversationChannelId(mailboxSlug, conversationSlug), "conversation.message", (event) => {
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
              className="lg:text-base text-sm text-foreground font-sundry-medium responsive-break-words truncate cursor-pointer hover:text-primary"
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
  const { setState: setLayoutState } = useLayoutInfo();

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
                    setLayoutState={setLayoutState}
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
                setLayoutState={setLayoutState}
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

const Conversation = () => {
  const { mailboxSlug, currentConversationSlug } = useConversationListContext();
  return (
    <ChannelProvider channelName={conversationChannelId(mailboxSlug, assertDefined(currentConversationSlug))}>
      <ConversationContextProvider>
        <ConversationContent />
      </ConversationContextProvider>
    </ChannelProvider>
  );
};

export default Conversation;
