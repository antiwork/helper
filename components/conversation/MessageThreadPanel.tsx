import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { MessageThread } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageThread";
import type { AttachedFile } from "@/app/types/global";
import { ScrollToTopButton } from "./ScrollToTopButton";

interface MessageThreadPanelProps {
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
  contentRef: React.MutableRefObject<HTMLElement | null>;
  setPreviewFileIndex: (index: number) => void;
  setPreviewFiles: (files: AttachedFile[]) => void;
}

export const MessageThreadPanel = ({
  scrollRef,
  contentRef,
  setPreviewFileIndex,
  setPreviewFiles,
}: MessageThreadPanelProps) => {
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
            />
          )}
        </div>
      </div>
    </div>
  );
};