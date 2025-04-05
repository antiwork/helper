import { ArrowUturnLeftIcon } from "@heroicons/react/16/solid";
import { ArrowTopRightOnSquareIcon, CurrencyDollarIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { AssignPopoverButton } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/assignPopoverButton";
import { Conversation } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { SimilarityCircle } from "@/components/similarityCircle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/components/utils/currency";
import { api } from "@/trpc/react";
import { useConversationListContext } from "./conversationListContext";

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
  removeConversation: () => void;
  updateConversation: (
    params: { mailboxSlug: string; conversationSlug: string; status: "open" | "closed" | "spam" },
    options: { onSuccess: () => void; onError: () => void },
  ) => void;
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
  removeConversation,
  updateConversation,
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
        className="mr-auto text-sm truncate"
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
            updateConversation(
              { mailboxSlug, conversationSlug: slug, status: "closed" },
              {
                onSuccess: () => {
                  removeConversation();
                  toast({ title: "Conversation closed" });
                },
                onError: () => {
                  toast({ variant: "destructive", title: "Failed to close conversation" });
                },
              },
            );
          }}
        >
          <ArrowUturnLeftIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
  const { navigateToConversation, removeConversation } = useConversationListContext();
  const { mutate: updateConversation } = api.mailbox.conversations.update.useMutation();
  const [previousExpanded, setPreviousExpanded] = useState(true);
  const [similarExpanded, setSimilarExpanded] = useState(false);

  const { data: customerConversations, isFetching: isFetchingPrevious } = api.mailbox.conversations.list.useQuery(
    { mailboxSlug, customer: [conversation.emailFrom ?? ""] },
    { enabled: !!conversation.emailFrom && previousExpanded },
  );

  const { data: similarConversations, isFetching: isFetchingSimilar } = api.mailbox.conversations.findSimilar.useQuery(
    { mailboxSlug, conversationSlug: conversation.slug },
    { enabled: similarExpanded },
  );

  const previousConversations = customerConversations?.conversations.filter(({ slug }) => slug !== conversation.slug);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col gap-3 text-sm p-4 border-b border-border">
        <h3>Conversation</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <span className="text-muted-foreground">Status</span>
          <div>
            <Badge>{conversation.status || "open"}</Badge>
          </div>
          <span className="text-muted-foreground">Assignee</span>
          <AssignPopoverButton
            initialAssignedToClerkId={conversation.assignedToClerkId}
            assignedToAI={conversation.assignedToAI}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 border-b border-border text-sm">
        <h3>Customer</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <Avatar fallback={conversation.emailFrom ?? ""} size="md" />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-base font-medium truncate"
              title={conversation.customerMetadata?.name || conversation.emailFrom || ""}
            >
              {conversation.customerMetadata?.name || conversation.emailFrom}
            </span>
            {conversation.customerMetadata?.isVip && <Badge variant="bright">VIP</Badge>}
            {conversation.customerMetadata?.value && conversation.customerMetadata.value > 0 && (
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <CurrencyDollarIcon className="h-4 w-4" />
                {formatCurrency(conversation.customerMetadata.value)}
              </div>
            )}
          </div>
          <CopyToClipboard
            text={conversation.emailFrom ?? ""}
            onCopy={(_, success) =>
              success
                ? toast({
                    variant: "success",
                    title: "Copied!",
                  })
                : toast({
                    variant: "destructive",
                    title: "Failed to copy to clipboard",
                  })
            }
          >
            <div className="col-start-2 text-primary flex cursor-pointer items-center gap-2">
              <EnvelopeIcon className="h-4 w-4" />
              <a
                className="overflow-hidden overflow-ellipsis whitespace-nowrap hover:underline"
                title={conversation.emailFrom ?? ""}
              >
                {conversation.emailFrom}
              </a>
            </div>
          </CopyToClipboard>

          {Object.entries(conversation.customerMetadata?.links ?? {}).map(([label, url], idx) => (
            <a
              key={idx}
              className="col-start-2 mt-1 flex items-center gap-2 hover:underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
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
                      removeConversation={removeConversation}
                      updateConversation={updateConversation}
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
                      removeConversation={removeConversation}
                      updateConversation={updateConversation}
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
