import cx from "classnames";
import { useMemo, useState, type JSX } from "react";
import type { AttachedFile, Conversation, Message as MessageType, Note as NoteType } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { FlagAsBadAction } from "./flagAsBadAction";
import { NoteEditor } from "./noteEditor";
import "@/components/linkCta.css";
import { truncate } from "lodash-es";
import {
  Bot,
  Download,
  Frown,
  Info,
  Mail,
  MailQuestion,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Sparkles,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMembers } from "@/components/useMembers";
import { useSession } from "@/components/useSession";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { renderMessageBody } from "./renderMessageBody";

function getPreviewUrl(file: AttachedFile): string {
  return file.previewUrl
    ? file.previewUrl
    : file.mimetype.startsWith("video/")
      ? "/images/attachment-preview-video.svg"
      : "/images/attachment-preview-default.svg";
}

const hasReasoningMetadata = (metadata: any): metadata is { reasoning: string } => {
  return metadata && typeof metadata.reasoning === "string";
};

const MessageContent = ({
  mainContent,
  quotedContext,
}: {
  mainContent: React.ReactNode;
  quotedContext: React.ReactNode | null;
}) => {
  const [showQuotedContext, setShowQuotedContext] = useState(false);

  return (
    <>
      {mainContent}
      {quotedContext ? (
        <>
          <button
            onClick={() => setShowQuotedContext(!showQuotedContext)}
            className={cx(
              "my-2 flex h-3 w-8 items-center justify-center rounded-full outline-hidden transition-colors duration-200",
              showQuotedContext
                ? "bg-muted-foreground text-muted-foreground"
                : "bg-border text-muted-foreground hover:text-muted-foreground",
            )}
          >
            <MoreHorizontal className="h-8 w-8" />
          </button>
          {showQuotedContext ? quotedContext : null}
        </>
      ) : null}
    </>
  );
};

const MessageItem = ({
  conversation,
  message,
  onViewDraftedReply,

  onPreviewAttachment,
}: {
  conversation: Conversation;
  message: (MessageType | NoteType) & { isNew?: boolean };
  onPreviewAttachment?: (index: number) => void;
  onViewDraftedReply?: () => void;
}) => {
  const userMessage = message.role === "user";
  const isAIMessage = message.type === "message" && message.role === "ai_assistant";
  const hasReasoning = isAIMessage && hasReasoningMetadata(message.metadata);
  const router = useRouter();
  const { user: currentUser } = useSession() ?? {};
  const [isEditingNote, setIsEditingNote] = useState(false);
  const utils = api.useUtils();

  const { data: orgMembers, isLoading: isLoadingMembers, error: membersError } = useMembers();

  const deleteNoteMutation = api.mailbox.conversations.notes.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.conversations.get.invalidate({
        conversationSlug: conversation.slug,
      });
      toast.success("Note deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete note", { description: error.message });
    },
  });

  const handleDeleteNote = () => {
    if (message.type === "note") {
      deleteNoteMutation.mutate({
        conversationSlug: conversation.slug,
        noteId: message.id,
      });
    }
  };

  const canEditNote = message.type === "note" && currentUser && message.userId === currentUser.id;

  const getDisplayName = (msg: MessageType | NoteType): string => {
    if (msg.type === "message") {
      if (msg.role === "user") {
        return msg.from || "Anonymous";
      }

      if (msg.role === "staff" && msg.userId) {
        const member = orgMembers?.find((m) => m.id === msg.userId);
        if (member?.displayName?.trim()) return member.displayName.trim();
        if (membersError) return "(error loading users)";
        if (isLoadingMembers) return "Loading...";
        return "Unknown user";
      }

      if (msg.role === "ai_assistant") {
        return "Helper agent";
      }

      return msg.from || "Helper agent";
    }

    if (msg.type === "note" && msg.userId) {
      const member = orgMembers?.find((m) => m.id === msg.userId);
      if (member?.displayName?.trim()) return member.displayName.trim();
      if (membersError) return "(error loading users)";
      if (isLoadingMembers) return "Loading...";
      return "Unknown user";
    }

    return "Helper agent";
  };

  const messageLabels: JSX.Element[] = [];
  const isFromDifferentEmail = message.type === "message" && message.from !== conversation.emailFrom;
  messageLabels.push(
    <span
      key={`${message.id}-from`}
      className={cn("flex items-center gap-1", userMessage && isFromDifferentEmail && "text-bright")}
    >
      {userMessage ? (
        isFromDifferentEmail ? (
          <MailQuestion className="h-3 w-3" />
        ) : conversation.source === "email" ? (
          <Mail className="h-3 w-3" />
        ) : (
          <MessageSquare className="h-3 w-3" />
        )
      ) : message.type === "note" ? (
        <StickyNote className="h-3 w-3" />
      ) : message.role === "staff" ? (
        <User className="h-3 w-3" />
      ) : (
        <Bot className="h-3 w-3" />
      )}
      {getDisplayName(message)}
    </span>,
  );
  if (message.type === "message" && message.emailTo)
    messageLabels.push(
      <span key={`${message.id}-to`} className="flex items-center gap-1">
        to: <span>{message.emailTo}</span>
      </span>,
    );
  if (message.type === "message" && message.cc.length > 0)
    messageLabels.push(
      <span key={`${message.id}-cc`} className="flex items-center gap-1">
        cc:{" "}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{truncate(message.cc.join(", "), { length: 150 })}</span>
            </TooltipTrigger>
            {message.cc.join(", ").length > 150 ? (
              <TooltipContent>
                {message.cc.map((email, i) => (
                  <div key={i}>{email}</div>
                ))}
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      </span>,
    );
  if (message.type === "message" && message.bcc.length > 0)
    messageLabels.push(
      <span key={`${message.id}-bcc`} className="flex items-center gap-1">
        bcc:{" "}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{truncate(message.bcc.join(", "), { length: 150 })}</span>
            </TooltipTrigger>
            {message.bcc.join(", ").length > 150 ? (
              <TooltipContent>
                {message.bcc.map((email, i) => (
                  <div key={i}>{email}</div>
                ))}
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      </span>,
    );

  const addSeparator = (array: JSX.Element[], separator: string): JSX.Element[] =>
    array.reduce<JSX.Element[]>(
      (acc, curr, index) =>
        index === 0 ? [curr] : [...acc, <span key={`${message.id}-separator-${index}`}>{separator}</span>, curr],
      [],
    );

  const isChatMessage =
    message.type === "message" && message.role === "user" && conversation.source !== "email" && !message.emailTo;
  const { mainContent, quotedContext } = useMemo(
    () =>
      renderMessageBody({
        body: message.body,
        isMarkdown: isChatMessage || message.type === "note" || isAIMessage,
        className: "lg:prose-base prose-sm **:text-foreground! **:bg-transparent!",
      }),
    [message.body, message.type, isAIMessage],
  );

  const splitMergedMutation = api.mailbox.conversations.splitMerged.useMutation({
    onSuccess: (conversation) => {
      router.push(`/conversations?id=${conversation.slug}`);
    },
    onError: (e) => {
      captureExceptionAndLog(e);
      toast.error("Failed to split conversation", { description: e.message });
    },
  });

  return (
    <div
      data-message-item
      data-type={message.type}
      data-id={message.id}
      className="responsive-break-words grid"
      data-testid="message-item"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">{addSeparator(messageLabels, "·")}</div>
        <div
          className={cx(
            "rounded-lg p-4",
            message.type === "note" ? "border border-bright/50" : message.role === "user" ? "bg-muted" : "border",
          )}
        >
          {message.type === "note" ? (
            <NoteEditor
              conversation={conversation}
              note={message}
              isEditing={isEditingNote}
              onCancelEdit={() => setIsEditingNote(false)}
            >
              <MessageContent mainContent={mainContent} quotedContext={quotedContext} />
            </NoteEditor>
          ) : (
            <MessageContent mainContent={mainContent} quotedContext={quotedContext} />
          )}
        </div>
        <div className="flex w-full items-center gap-3 text-sm text-muted-foreground">
          {message.type === "message" && message.isMerged && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ConfirmationDialog
                    message="Are you sure you want to separate this conversation?"
                    onConfirm={() => {
                      splitMergedMutation.mutate({ messageId: message.id });
                    }}
                  >
                    <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                      <span className="text-xs">Merged</span>
                    </button>
                  </ConfirmationDialog>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Automatically merged based on similarity. Click to split.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {message.isNew && <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-blue-500" />}
          {hasReasoning && !userMessage && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">View AI reasoning</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(calc(100vw-2rem),400px)]"
                align="start"
                side="top"
                avoidCollisions
                collisionPadding={16}
              >
                <div className="space-y-2">
                  <h4 className="font-medium">AI Reasoning</h4>
                  <div className="max-h-[300px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {isAIMessage && hasReasoningMetadata(message.metadata) && message.metadata.reasoning}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {message.type === "message" && message.reactionType && (
            <span className="inline-flex items-center gap-1 text-xs">
              {message.reactionType === "thumbs-up" ? (
                <ThumbsUp size={14} className="text-green-500" />
              ) : (
                <ThumbsDown size={14} className="text-red-500" />
              )}
              {message.reactionFeedback}
            </span>
          )}
          {message.type === "message" && message.isFlaggedAsBad && (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
              <Frown size={14} className="text-red-500" /> {message.reason ?? "Flagged as bad"}
            </span>
          )}
          <div className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <HumanizedTime time={message.createdAt} />
              {message.type === "message" && message.slackUrl && (
                <span>
                  <a target="_blank" href={message.slackUrl}>
                    &nbsp;{message.role === "user" ? "alerted on Slack" : "via Slack"}
                  </a>
                </span>
              )}
              {onViewDraftedReply && (
                <span>
                  &nbsp;·{" "}
                  <button className="cursor-pointer underline" onClick={onViewDraftedReply}>
                    View drafted reply
                  </button>
                </span>
              )}
            </div>
            {message.type === "message" && message.status === "failed" && (
              <div className="align-center flex items-center justify-center gap-0.5 text-sm text-muted">
                <Info className="h-4 w-4" />
                <span>Email failed to send</span>
              </div>
            )}
            {message.type === "message" && message.role === "ai_assistant" && (
              <FlagAsBadAction message={message} conversationSlug={conversation.slug} />
            )}
            {canEditNote && !isEditingNote && (
              <>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsEditingNote(true)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="text-xs">Edit</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit this note</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ConfirmationDialog
                        message="Are you sure you want to delete this note? This action cannot be undone."
                        onConfirm={handleDeleteNote}
                        confirmLabel="Delete"
                      >
                        <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="text-xs">Delete</span>
                        </button>
                      </ConfirmationDialog>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete this note</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
        {message.files.length ? (
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
            {message.files.map((file, idx) => (
              <a
                key={idx}
                href={file.presignedUrl ?? undefined}
                title={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-40 flex-col overflow-hidden rounded-md border border-border hover:border-border"
                onClick={(e) => {
                  if (onPreviewAttachment) {
                    e.preventDefault();
                    onPreviewAttachment(idx);
                  }
                }}
              >
                <div
                  className="h-24 w-full overflow-hidden rounded-t bg-cover bg-center"
                  style={{ backgroundImage: `url(${getPreviewUrl(file)})` }}
                >
                  {}
                </div>

                <div className="inline-flex items-center gap-1 rounded-b border-t border-t-border p-2 text-xs">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="max-w-[10rem] truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MessageItem;
