import FileSaver from "file-saver";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Link as LinkIcon,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useStickToBottom } from "use-stick-to-bottom";
import {
  ConversationContextProvider,
  useConversationContext,
} from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { MessageThread } from "@/app/(dashboard)/[category]/conversation/messageThread";
import Viewers from "@/app/(dashboard)/[category]/conversation/viewers";
import { useConversationListContext } from "@/app/(dashboard)/[category]/list/conversationListContext";
import { ConversationListItemContent } from "@/app/(dashboard)/[category]/list/conversationListItem";
import PreviewModal from "@/app/(dashboard)/[category]/previewModal";
import {
  type AttachedFile,
  type ConversationEvent,
  type Conversation as ConversationType,
  type GuideSession,
  type Message,
  type Note,
} from "@/app/types/global";
import { CarouselDirection, createCarousel } from "@/components/carousel";
import LoadingSpinner from "@/components/loadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useSession } from "@/components/useSession";
import type { serializeMessage } from "@/lib/data/conversationMessage";
import { conversationChannelId } from "@/lib/realtime/channels";
import { useRealtimeEvent } from "@/lib/realtime/hooks";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import ConversationSidebar from "./conversationSidebar";
import { MessageActions } from "./messageActions";

export type ConversationWithNewMessages = Omit<ConversationType, "messages"> & {
  messages: ((Message | Note | ConversationEvent | GuideSession) & { isNew?: boolean })[];
};

const { Carousel, CarouselButton, CarouselContext } = createCarousel<AttachedFile>();

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
        <button
          className={cn(
            "transition-all duration-200 h-8 w-8 p-0 rounded-full",
            "flex items-center justify-center",
            "bg-background border border-border shadow-xs cursor-pointer",
            "hover:border-primary hover:shadow-md hover:bg-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
          )}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          tabIndex={show ? 0 : -1}
        >
          <ArrowUp className="h-4 w-4 text-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent align="start">Scroll to top</TooltipContent>
    </Tooltip>
  );
};

const MessageThreadPanel = ({
  scrollRef,
  contentRef,
  setPreviewFileIndex,
  setPreviewFiles,
}: {
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
  contentRef: React.MutableRefObject<HTMLElement | null>;
  setPreviewFileIndex: (index: number) => void;
  setPreviewFiles: (files: AttachedFile[]) => void;
}) => {
  const { user } = useSession() ?? {};
  const { data: conversationInfo } = useConversationContext();
  const { conversationListData, currentIndex, moveToNextConversation } = useConversationListContext();
  const nextConversation = conversationListData?.conversations[currentIndex + 1] ?? null;

  return (
    <div
      className="grow overflow-y-auto relative flex flex-col justify-between"
      ref={scrollRef}
      data-testid="message-thread-panel"
    >
      <div ref={contentRef as React.RefObject<HTMLDivElement>} className="relative">
        <div className="flex flex-col gap-8 px-4 py-4 h-full">
          {conversationInfo && (
            <MessageThread
              conversation={conversationInfo}
              onPreviewAttachment={(message, currentIndex) => {
                setPreviewFileIndex(currentIndex);
                setPreviewFiles(message.files);
              }}
            />
          )}
        </div>
      </div>
      <div className="sticky bottom-4 left-4 right-4 z-10 mx-4 mt-2">
        <div className="relative">
          <div className="absolute -top-12 left-0 z-10">
            <ScrollToTopButton scrollRef={scrollRef} />
          </div>
          {!user?.preferences?.disableNextTicketPreview && nextConversation && (
            <div
              className={cn(
                "transition-all duration-200 ease-in-out px-3 py-2 border rounded-lg bg-muted transform cursor-pointer hover:shadow-sm hover:scale-[1.01]",
              )}
              onClick={moveToNextConversation}
            >
              <ConversationListItemContent conversation={nextConversation} emailPrefix="Answer Next: " />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageActionsPanel = () => {
  return (
    <div
      className="h-full overflow-y-auto bg-muted px-4 pb-4"
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
  subject,
  isAboveSm,
  sidebarVisible,
  setSidebarVisible,
}: {
  subject: string;
  isAboveSm: boolean;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}) => {
  const { data: conversationInfo } = useConversationContext();
  const { minimize, moveToNextConversation, moveToPreviousConversation, currentIndex, currentTotal, hasNextPage } =
    useConversationListContext();

  return (
    <div
      className={cn(
        "flex items-center border-b border-border h-12 px-2 md:px-4 gap-x-2",
        !conversationInfo && "hidden",
      )}
      style={{ minHeight: 48 }}
      data-testid="conversation-header"
    >
      <div className="flex items-center min-w-0 flex-shrink-0 z-10 lg:w-44">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={minimize}
          className="text-primary hover:text-foreground"
          aria-label="Close View"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex items-center ml-2">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={moveToPreviousConversation}
            aria-label="Previous conversation"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {currentIndex >= 0 && (
            <span
              className="text-sm text-muted-foreground whitespace-nowrap text-center mx-1"
              data-testid="conversation-counter"
            >
              {currentIndex + 1} of {currentTotal}
              {hasNextPage ? "+" : ""}
            </span>
          )}
          <Button variant="ghost" size="sm" iconOnly onClick={moveToNextConversation} aria-label="Next conversation">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex justify-center">
        <div
          className="truncate text-base font-semibold text-foreground text-center max-w-full"
          data-testid="conversation-subject"
        >
          {subject ?? "(no subject)"}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 z-10 lg:w-44 justify-end">
        <CopyLinkButton />
        {conversationInfo?.id && <Viewers conversationSlug={conversationInfo.slug} />}
        <Button
          variant={!isAboveSm && sidebarVisible ? "subtle" : "ghost"}
          size="sm"
          iconOnly
          onClick={() => setSidebarVisible(!sidebarVisible)}
          aria-label="Toggle sidebar"
        >
          {isAboveSm ? (
            sidebarVisible ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span className="sr-only">{sidebarVisible ? "Hide sidebar" : "Show sidebar"}</span>
        </Button>
      </div>
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
                  <button
                    onClick={() =>
                      currentFile.presignedUrl && FileSaver.saveAs(currentFile.presignedUrl, currentFile.name)
                    }
                    aria-label={`Download ${currentFile.name}`}
                    className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-1 hover:bg-muted transition-colors"
                  >
                    <Download className="text-primary h-5 w-5 shrink-0" />
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
  const { data: conversationInfo } = useConversationContext();
  if (!conversationInfo?.mergedInto?.slug) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/75 flex flex-col items-center justify-center gap-4 h-full text-lg">
      Merged into another conversation.
      <Button variant="subtle" asChild>
        <Link href={`/conversations?id=${conversationInfo.mergedInto.slug}`}>View</Link>
      </Button>
    </div>
  );
};

const ConversationContent = () => {
  const { conversationSlug, data: conversationInfo, isPending, error } = useConversationContext();
  const utils = api.useUtils();
  const { input } = useConversationsListInput();

  useRealtimeEvent(conversationChannelId(conversationSlug), "conversation.updated", (event) => {
    utils.mailbox.conversations.get.setData({ conversationSlug }, (data) => (data ? { ...data, ...event.data } : null));
  });
  useRealtimeEvent(conversationChannelId(conversationSlug), "conversation.message", (event) => {
    const message = { ...event.data, createdAt: new Date(event.data.createdAt) } as Awaited<
      ReturnType<typeof serializeMessage>
    >;
    utils.mailbox.conversations.get.setData({ conversationSlug }, (data) => {
      if (!data) return undefined;
      if (data.messages.some((m) => m.id === message.id)) return data;

      return { ...data, messages: [...data.messages, { ...message, isNew: true }] };
    });
    scrollToBottom({ animation: "smooth" });
  });
  const conversationListInfo = utils.mailbox.conversations.list
    .getData(input)
    ?.conversations.find((c) => c.slug === conversationSlug);

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

  const defaultSize =
    typeof window !== "undefined" ? Number(localStorage.getItem("conversationHeightRange") ?? 65) : 65;

  const [sidebarVisible, setSidebarVisible] = useState(isAboveSm);

  if (isAboveSm) {
    return (
      <ResizablePanelGroup direction="horizontal" className="relative flex w-full">
        <ResizablePanel defaultSize={75} minSize={50} maxSize={85}>
          <ResizablePanelGroup direction="vertical" className="flex w-full flex-col bg-background">
            <ResizablePanel
              defaultSize={defaultSize}
              onResize={(size) => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("conversationHeightRange", Math.floor(size).toString());
                }

                const scrollElement = scrollRef.current;
                if (scrollElement) {
                  const threshold = 50;
                  const isAtBottom =
                    scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight <= threshold;
                  if (isAtBottom) {
                    scrollToBottom({ animation: "instant" });
                  }
                }
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
                  subject={
                    (conversationListInfo?.subject || conversationInfo?.subject) ?? (isPending ? "" : "(no subject)")
                  }
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
            <ResizablePanel defaultSize={100 - defaultSize} minSize={25} maxSize={80}>
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
          {conversationInfo && sidebarVisible ? <ConversationSidebar conversation={conversationInfo} /> : null}
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
          subject={(conversationListInfo?.subject || conversationInfo?.subject) ?? (isPending ? "" : "(no subject)")}
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
          <ConversationSidebar conversation={conversationInfo} />
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
