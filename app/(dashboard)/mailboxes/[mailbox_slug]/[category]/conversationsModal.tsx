import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { SimilarityCircle } from "@/components/similarityCircle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { MessageThread } from "./conversation/messageThread";

const extractSummary = (embeddingText: string): string | null => {
  const summaryRegex = /<summary>(.*?)<\/summary>/s;
  const match = summaryRegex.exec(embeddingText);
  if (!match?.[1]) return null;
  return match[1].trim();
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mailboxSlug: string;
  title: string;
  conversations: NonNullable<RouterOutputs["mailbox"]["conversations"]["findSimilar"]>["conversations"];
  isLoading?: boolean;
  showSimilarity?: boolean;
  similarity?: Record<string, number>;
};

const ConversationsModal = ({
  open,
  onOpenChange,
  mailboxSlug,
  title,
  conversations,
  isLoading,
  showSimilarity,
  similarity = {},
}: Props) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  useEffect(() => {
    setSelectedConversation(conversations?.[0]?.slug ?? null);
  }, [conversations]);

  const { data: selectedConversationData, isLoading: isLoadingConversation } = api.mailbox.conversations.get.useQuery(
    { mailboxSlug, conversationSlug: selectedConversation ?? "" },
    { enabled: !!selectedConversation },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] md:max-w-7xl max-h-[95vh] md:max-h-[80vh] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : conversations?.length > 0 ? (
          <div className="flex flex-col md:flex-row rounded-lg border border-border overflow-hidden mt-2 md:mt-4">
            {/* Mobile: Show either list or detail based on mobileView state */}
            <div
              className={cn(
                "w-full md:w-[350px] overflow-y-auto border-b md:border-b-0 md:border-r border-border",
                "md:block", // Always show on desktop
                mobileView === "list" ? "block" : "hidden", // Show/hide on mobile based on state
              )}
            >
              {/* Mobile: Add back button when showing list */}
              <div className="md:hidden bg-muted/30 p-3 border-b border-border">
                <h3 className="font-medium">Select Conversation</h3>
              </div>
              <div className="max-h-[60vh] md:max-h-[calc(80vh-8rem)] overflow-y-auto">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.slug}
                    className={cn(
                      "p-4 md:p-3 md:pl-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation",
                      {
                        "bg-accent": selectedConversation === conversation.slug,
                      },
                    )}
                    onClick={() => {
                      setSelectedConversation(conversation.slug);
                      setMobileView("detail"); // Switch to detail view on mobile
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-medium text-sm md:text-base line-clamp-2 flex-1 min-w-0">
                          {conversation.subject || "(no subject)"}
                        </h3>
                        <div className="flex items-center gap-1 md:gap-2 shrink-0 min-w-fit">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            <HumanizedTime time={conversation.createdAt} />
                          </span>
                          <a
                            href={`/mailboxes/${mailboxSlug}/conversations?id=${conversation.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors p-1 -m-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
                          </a>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 md:line-clamp-2">
                        {(conversation.embeddingText && extractSummary(conversation.embeddingText)) ||
                          (conversation.summary && conversation.summary) ||
                          "(no summary)"}
                      </p>
                      {showSimilarity && similarity?.[conversation.slug] && (
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <SimilarityCircle similarity={similarity[conversation.slug]!} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile: Show detail view with back button */}
            <div
              className={cn(
                "flex-1 overflow-y-auto bg-muted/30",
                "md:block", // Always show on desktop
                mobileView === "detail" ? "block" : "hidden", // Show/hide on mobile based on state
              )}
            >
              {/* Mobile: Back button header */}
              <div className="md:hidden bg-background border-b border-border p-3 flex items-center gap-3">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex items-center gap-2 text-sm font-medium hover:text-accent-foreground transition-colors"
                >
                  ← Back to conversations
                </button>
              </div>

              <div className="h-[65vh] md:h-[calc(80vh-8rem)] overflow-y-auto p-3 md:p-4">
                {isLoadingConversation ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : selectedConversationData ? (
                  <MessageThread
                    mailboxSlug={mailboxSlug}
                    conversation={selectedConversationData}
                    onPreviewAttachment={() => {}}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Select a conversation to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No conversations found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConversationsModal;
