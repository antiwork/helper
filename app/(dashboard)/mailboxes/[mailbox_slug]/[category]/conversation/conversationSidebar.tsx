import { CornerUpLeft, DollarSign, ExternalLink, Mail } from "lucide-react";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { AssignPopoverButton } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/assignPopoverButton";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { Conversation } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { SimilarityCircle } from "@/components/similarityCircle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/components/utils/currency";
import { cn } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils/toast";
import { api } from "@/trpc/react";

interface ConversationSidebarProps {
  mailboxSlug: string;
  conversation: Conversation;
}

interface ConversationItemProps {
  slug: string;
  subject: string;
  summary?: string | string[] | null;
  createdAt: Date;
  similarity?: number;
  status: "open" | "closed" | "spam" | null;
  mailboxSlug: string;
  navigateToConversation: (slug: string) => void;
  updateStatus: (status: "closed" | "spam" | "open") => void;
}

const ConversationItem = ({
  slug,
  subject,
  summary,
  createdAt,
  similarity,
  status,
  mailboxSlug,
  navigateToConversation,
  updateStatus,
}: ConversationItemProps) => (
  <div
    key={slug}
    className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer group"
    onClick={() => navigateToConversation(slug)}
  >
    <div className="flex items-center gap-2 mb-1">
      <a
        href={`/mailboxes/${mailboxSlug}/conversations?id=${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("mr-auto text-sm truncate", status === "open" && "font-bold")}
        onClick={(e) => e.stopPropagation()}
      >
        {subject || "(no subject)"}
      </a>
      {status && status !== "closed" && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            updateStatus("closed");
          }}
        >
          <CornerUpLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
      <div className="flex items-center text-xs text-muted-foreground gap-2">
        <HumanizedTime time={createdAt} />
        {similarity !== undefined && <SimilarityCircle similarity={similarity} />}
      </div>
    </div>
    {summary && <div className="text-muted-foreground text-xs line-clamp-2 mb-2">{summary}</div>}
  </div>
);

const ConversationSidebar = ({ mailboxSlug, conversation }: ConversationSidebarProps) => {
  const { navigateToConversation } = useConversationListContext();
  const { updateStatus } = useConversationContext();
  const [previousExpanded, setPreviousExpanded] = useState(true);
  const [similarExpanded, setSimilarExpanded] = useState(false);

  const { data: customerConversations, isFetching: isFetchingPrevious } = api.mailbox.conversations.list.useQuery(
    { mailboxSlug, customer: [conversation.emailFrom ?? ""], sort: "newest" },
    { enabled: !!conversation.emailFrom && previousExpanded },
  );

  const { data: similarConversations, isFetching: isFetchingSimilar } = api.mailbox.conversations.findSimilar.useQuery(
    { mailboxSlug, conversationSlug: conversation.slug },
    { enabled: similarExpanded },
  );

  const previousConversations = customerConversations?.conversations.filter(({ slug }) => slug !== conversation.slug);

  return (
    <div className="flex flex-col h-dvh bg-background">
      <div className="flex flex-col gap-3 text-sm p-4 border-b border-border">
        <h3>Conversation</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <span className="text-muted-foreground">Status</span>
          <div>
            <Badge>{conversation.status || "open"}</Badge>
          </div>
          <span className="text-muted-foreground">Assignee</span>
          <div className="min-w-0">
            <AssignPopoverButton
              initialAssignedToId={conversation.assignedToId}
              assignedToAI={conversation.assignedToAI}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 border-b border-border text-sm">
        <h3>Customer</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <Avatar fallback={conversation.emailFrom ?? "?"} size="md" />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "truncate",
                conversation.customerMetadata?.name || conversation.emailFrom
                  ? "text-base font-medium"
                  : "text-muted-foreground",
              )}
              title={conversation.customerMetadata?.name || conversation.emailFrom || ""}
            >
              {conversation.customerMetadata?.name || conversation.emailFrom || "Anonymous"}
            </span>
            {conversation.customerMetadata?.isVip && <Badge variant="bright">VIP</Badge>}
            {conversation.customerMetadata?.value && conversation.customerMetadata.value > 0 && (
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(conversation.customerMetadata.value)}
              </div>
            )}
          </div>
          {conversation.emailFrom && (
            <CopyToClipboard
              text={conversation.emailFrom ?? ""}
              onCopy={(_, success) =>
                success ? showSuccessToast("Copied!") : showErrorToast("Failed to copy to clipboard")
              }
            >
              <div className="col-start-2 text-primary flex cursor-pointer items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a
                  className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline min-w-0 flex-1"
                  title={conversation.emailFrom ?? ""}
                >
                  {conversation.emailFrom}
                </a>
              </div>
            </CopyToClipboard>
          )}

          {Object.entries(conversation.customerMetadata?.links ?? {}).map(([label, url], idx) => (
            <a
              key={idx}
              className="col-start-2 mt-1 flex items-center gap-2 hover:underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={["previous"]}>
          <AccordionItem value="previous">
            <AccordionTrigger className="px-4" onClick={() => setPreviousExpanded(!previousExpanded)}>
              Previous conversations
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-3">
                {isFetchingPrevious ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : previousConversations?.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No previous conversations</div>
                ) : (
                  previousConversations?.map((conv) => (
                    <ConversationItem
                      key={conv.slug}
                      slug={conv.slug}
                      subject={conv.subject}
                      summary={conv.summary}
                      createdAt={conv.createdAt}
                      status={conv.status}
                      mailboxSlug={mailboxSlug}
                      navigateToConversation={navigateToConversation}
                      updateStatus={updateStatus}
                    />
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="similar">
            <AccordionTrigger className="px-4" onClick={() => setSimilarExpanded(!similarExpanded)}>
              Similar conversations
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-3">
                {isFetchingSimilar ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : similarConversations?.conversations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No similar conversations</div>
                ) : (
                  similarConversations?.conversations.map((conv) => (
                    <ConversationItem
                      key={conv.slug}
                      slug={conv.slug}
                      subject={conv.subject}
                      summary={conv.summary}
                      createdAt={conv.createdAt}
                      status={conv.status}
                      similarity={similarConversations?.similarityMap?.[conv.slug]}
                      mailboxSlug={mailboxSlug}
                      navigateToConversation={navigateToConversation}
                      updateStatus={updateStatus}
                    />
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default ConversationSidebar;
