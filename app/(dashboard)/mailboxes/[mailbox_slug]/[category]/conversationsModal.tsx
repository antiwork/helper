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
  title: string;
  conversations: NonNullable<RouterOutputs["mailbox"]["conversations"]["findSimilar"]>["conversations"];
  isLoading?: boolean;
  showSimilarity?: boolean;
  similarity?: Record<string, number>;
};

const ConversationsModal = ({
  open,
  onOpenChange,
  title,
  conversations,
  isLoading,
  showSimilarity,
  similarity = {},
}: Props) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  useEffect(() => {
    setSelectedConversation(conversations?.[0]?.slug ?? null);
  }, [conversations]);

  const { data: selectedConversationData, isLoading: isLoadingConversation } = api.mailbox.conversations.get.useQuery(
    { conversationSlug: selectedConversation ?? "" },
    { enabled: !!selectedConversation },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : conversations?.length > 0 ? (
          <div className="flex rounded-lg border border-border overflow-hidden mt-4">
            <div className="w-[350px] h-[calc(80vh-8rem)] overflow-y-auto border-r border-border">
              {conversations.map((conversation) => (
                <div
                  key={conversation.slug}
                  className={cn("p-3 pl-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors", {
                    "bg-accent": selectedConversation === conversation.slug,
                  })}
                  onClick={() => setSelectedConversation(conversation.slug)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">{conversation.subject || "(no subject)"}</h3>
                      <span className="text-sm text-muted-foreground whitespace-nowrap ml-2 flex items-center gap-2">
                        <HumanizedTime time={conversation.createdAt} />
                        <a
                          href={`/conversations?id=${conversation.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
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
            <div className="flex-1 h-[calc(80vh-8rem)] overflow-y-auto p-4 bg-muted/30">
              {isLoadingConversation ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : selectedConversationData ? (
                <MessageThread conversation={selectedConversationData} onPreviewAttachment={() => {}} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a conversation to view details
                </div>
              )}
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
