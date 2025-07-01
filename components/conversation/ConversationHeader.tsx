import { ChevronLeft, ChevronRight, Info, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import Viewers from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/viewers";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "./CopyLinkButton";

interface ConversationHeaderProps {
  conversationMetadata: any;
  isAboveSm: boolean;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

export const ConversationHeader = ({
  conversationMetadata,
  isAboveSm,
  sidebarVisible,
  setSidebarVisible,
}: ConversationHeaderProps) => {
  const { mailboxSlug, data: conversationInfo } = useConversationContext();
  const { minimize, moveToNextConversation, moveToPreviousConversation, currentIndex, currentTotal, hasNextPage } =
    useConversationListContext();

  return (
    <div
      className={cn(
        "flex items-center border-b border-border h-12 px-2 md:px-4 gap-x-2",
        !conversationInfo && "hidden",
      )}
      style={{ minHeight: 48 }}
    >
      <div className="flex items-center min-w-0 flex-shrink-0 z-10 lg:w-44">
        <Button variant="ghost" size="sm" iconOnly onClick={minimize} className="text-primary hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
        <div className="flex items-center ml-2">
          <Button variant="ghost" size="sm" iconOnly onClick={moveToPreviousConversation}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap text-center mx-1">
            {currentIndex + 1} of {currentTotal}
            {hasNextPage ? "+" : ""}
          </span>
          <Button variant="ghost" size="sm" iconOnly onClick={moveToNextConversation}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="truncate text-base font-semibold text-foreground text-center max-w-full">
          {conversationMetadata.subject ?? "(no subject)"}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 z-10 lg:w-44 justify-end">
        <CopyLinkButton />
        {conversationInfo?.id && <Viewers mailboxSlug={mailboxSlug} conversationSlug={conversationInfo.slug} />}
        <Button
          variant={!isAboveSm && sidebarVisible ? "subtle" : "ghost"}
          size="sm"
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
            <Info className="h-4 w-4" />
          )}
          <span className="sr-only">{sidebarVisible ? "Hide sidebar" : "Show sidebar"}</span>
        </Button>
      </div>
    </div>
  );
};