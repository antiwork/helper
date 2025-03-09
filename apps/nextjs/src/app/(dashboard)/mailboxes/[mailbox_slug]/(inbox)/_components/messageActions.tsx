import { ArrowUturnUpIcon, BoltIcon } from "@heroicons/react/20/solid";
import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { useLayoutInfo } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/useLayoutInfo";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationContext";
import { useFileUpload } from "@/components/fileUploadContext";
import { useExpiringLocalStorage } from "@/components/hooks/use-expiring-local-storage";
import { toast } from "@/components/hooks/use-toast";
import LabeledInput from "@/components/labeledInput";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import type { DraftedEmail } from "@/serverActions/messages";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useUndoneEmailStore } from "./conversation";
import { useConversationListContext } from "./conversationListContext";
import { GitHubIssueButton } from "./githubIssueButton";
import { useConversationsListInput } from "./shared/queries";
import { TicketCommandBar } from "./ticketCommandBar";

export const FAILED_ATTACHMENTS_TOOLTIP_MESSAGE = "Remove the failed file attachments first";

export const isEmptyContent = (text: string | undefined) => {
  if (!text?.trim()) return true;
  const domParser = new DOMParser();
  const dom = domParser.parseFromString(text, "text/html");
  return !dom.documentElement.textContent && !dom.querySelector('img[src]:not([src=""])');
};

export const useSendDisabled = (message: string | undefined) => {
  const [sending, setSending] = useState(false);
  const { uploading, failedAttachmentsExist, hasReadyFileAttachments } = useFileUpload();

  const sendDisabled =
    sending || (isEmptyContent(message) && !hasReadyFileAttachments) || uploading || failedAttachmentsExist;
  return { sendDisabled, sending, setSending };
};

export const MessageActions = () => {
  const { navigateToConversation } = useConversationListContext();
  const { data: conversation, mailboxSlug, refetch, updateStatus } = useConversationContext();
  const { searchParams } = useConversationsListInput();
  const utils = api.useUtils();
  const { state: layoutState } = useLayoutInfo();
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const onToggleCc = useCallback(() => setShowCc(!showCc), [showCc]);

  const { mutate: refreshDraft } = api.mailbox.conversations.refreshDraft.useMutation({
    onMutate: () => {
      setRefreshingDraft(true);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error generating draft",
      });
      setRefreshingDraft(false);
    },
  });

  useKeyboardShortcut("z", () => {
    if (conversation?.status === "closed" || conversation?.status === "spam") {
      updateStatus("open");
    }
  });
  useKeyboardShortcut("s", () => {
    if (conversation?.status !== "spam") {
      updateStatus("spam");
    }
  });
  useKeyboardShortcut("c", () => {
    if (conversation?.status !== "closed") {
      updateStatus("closed");
    }
  });

  const storageKey = `draft/${conversation?.slug}`;
  const [storedMessage, setStoredMessage] = useExpiringLocalStorage<string>(storageKey, {
    shouldStore: (value) => !isEmptyContent(value),
  });

  const initialMessage = conversation?.draft?.body ?? "";
  const generateInitialDraftedEmail = (conversation: RouterOutputs["mailbox"]["conversations"]["get"] | null) => {
    return {
      cc: conversation?.cc ?? "",
      bcc: "",
      message: initialMessage,
      files: [],
      modified: false,
    };
  };
  const [draftedEmail, setDraftedEmail] = useState<DraftedEmail & { modified: boolean }>(
    generateInitialDraftedEmail(conversation),
  );
  const [initialMessageObject, setInitialMessageObject] = useState({ content: "" });
  const { undoneEmail, setUndoneEmail } = useUndoneEmailStore();
  useEffect(() => {
    if (!conversation) return;

    if (undoneEmail) {
      setDraftedEmail({ ...undoneEmail, modified: true });
      setInitialMessageObject({ content: undoneEmail.message });
      resetFiles(undoneEmail.files);
      setUndoneEmail(undefined);
      return;
    }

    if (!draftedEmail.modified) {
      const email = generateInitialDraftedEmail(conversation);
      setDraftedEmail(email);
      setInitialMessageObject({ content: email.message });
    }
  }, [conversation]);
  useEffect(() => {
    // Updates the drafted email upon draft refreshes
    if (conversation?.draft?.id) {
      const message = conversation?.draft.body ?? "";
      setDraftedEmail((email) => ({ ...email, message }));
      setInitialMessageObject({ content: message });
    }
  }, [conversation?.draft?.id]);

  useEffect(() => {
    if (storedMessage && !draftedEmail.modified) {
      setInitialMessageObject({ content: storedMessage });
      setDraftedEmail((prev) => ({ ...prev, message: storedMessage, modified: true }));
    }
  }, [storedMessage]);

  const { readyFiles, resetFiles } = useFileUpload();
  const { sendDisabled, sending, setSending } = useSendDisabled(draftedEmail.message);
  const handleSend = async ({ assign, close = true }: { assign: boolean; close?: boolean }) => {
    if (sendDisabled || !conversation?.slug) return;

    setSending(true);
    try {
      const cc_emails = draftedEmail.cc.replace(/\s/g, "").split(",");
      const bcc_emails = draftedEmail.bcc.replace(/\s/g, "").split(",");
      const conversationSlug = conversation.slug;

      const lastUserMessage = conversation.messages
        ?.filter((m) => m.type === "message" && m.role === "user")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const { id: emailId } = await utils.client.mailbox.conversations.messages.reply.mutate({
        mailboxSlug,
        conversationSlug,
        message: draftedEmail.message,
        fileSlugs: readyFiles.flatMap((f) => (f.slug ? [f.slug] : [])),
        cc: cc_emails,
        bcc: bcc_emails,
        shouldAutoAssign: assign,
        shouldClose: close,
        responseToId: lastUserMessage?.id ?? null,
      });
      setDraftedEmail({ message: "", files: [], cc: "", bcc: "", modified: false });
      setInitialMessageObject({ content: "" });
      resetFiles([]);
      setStoredMessage("");
      if (conversation.status === "open" && close) {
        updateStatus("closed");
      }
      toast({
        title: "Message sent!",
        variant: "success",
        action: (
          <>
            <ToastAction
              altText="Visit"
              onClick={() => {
                utils.mailbox.conversations.get.invalidate({ mailboxSlug, conversationSlug });
                navigateToConversation(conversation.slug);
              }}
            >
              Visit
            </ToastAction>
            <ToastAction
              altText="Undo"
              onClick={async () => {
                try {
                  await utils.client.mailbox.conversations.undo.mutate({
                    mailboxSlug,
                    conversationSlug,
                    emailId,
                  });
                  setUndoneEmail({ ...draftedEmail, files: readyFiles });
                  toast({
                    title: "Message unsent",
                    variant: "success",
                  });
                } catch (e) {
                  console.error(e);
                  toast({
                    variant: "destructive",
                    title: "Failed to unsend email",
                  });
                } finally {
                  utils.mailbox.conversations.get.invalidate({ mailboxSlug, conversationSlug });
                  navigateToConversation(conversation.slug);
                }
              }}
            >
              Undo
            </ToastAction>
          </>
        ),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error submitting message",
      });
    } finally {
      setSending(false);
    }

    if (conversation?.status !== "open") {
      refetch();
    }
  };

  // Handle Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandBar(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const actionButtons = (
    <>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur">
        {/* Desktop view */}
        <div className="hidden md:flex items-center gap-2">
          {(conversation?.status ?? searchParams.status) !== "spam" &&
            ((conversation?.status ?? searchParams.status) === "closed" ? (
              <Button variant="outlined" onClick={() => updateStatus("open")}>
                <ArrowUturnUpIcon className="mr-2 h-4 w-4" />
                Reopen
              </Button>
            ) : (
              <>
                <Button onClick={() => handleSend({ assign: false })} disabled={sendDisabled}>
                  {sending ? "Replying..." : "Reply and close"}
                  {!sending && <span className="sr-only">(R)</span>}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSend({ assign: false, close: false })}
                  disabled={sendDisabled}
                >
                  Reply
                </Button>
                <Button variant="ghost" onClick={() => setShowCommandBar(true)}>
                  <BoltIcon className="mr-2 h-4 w-4" />
                  Actions
                  <kbd className="ml-2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </Button>
                {conversation && (
                  <GitHubIssueButton
                    mailboxSlug={mailboxSlug}
                    conversationSlug={conversation.slug}
                    conversationSubject={conversation.subject || ""}
                    conversationSummary={conversation.summary}
                  />
                )}
              </>
            ))}
        </div>
        {/* Mobile view */}
        <div className="md:hidden">
          <Button variant="outlined" onClick={() => setShowCommandBar(true)}>
            <BoltIcon className="mr-2 h-4 w-4" />
            Actions
          </Button>
        </div>
      </div>
    </>
  );

  const updateDraftedEmail = (changes: Partial<DraftedEmail>) => {
    setDraftedEmail((email) => ({ ...email, ...changes, modified: true }));
    setStoredMessage(changes.message);
  };

  const [refreshingDraft, setRefreshingDraft] = useState(false);

  const handleInsertReply = (content: string) => {
    setDraftedEmail((prev) => ({
      ...prev,
      message: content,
      modified: true,
    }));
    setInitialMessageObject({ content });
    setStoredMessage(content);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const editorRef = useRef<TipTapEditorRef>(null);

  return (
    <div className="flex flex-col h-full pt-3">
      <div className="flex-grow overflow-auto mt-2">
        <EmailEditorComponent
          ref={editorRef}
          onSend={() => handleSend({ assign: false })}
          actionButtons={actionButtons}
          draftedEmail={draftedEmail}
          initialMessage={initialMessageObject}
          updateEmail={updateDraftedEmail}
          setShowCommandBar={setShowCommandBar}
          showCc={showCc}
        />
      </div>
      <div className="flex-shrink-0 mt-3">
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex items-center gap-2" />
        </div>
      </div>

      <TicketCommandBar
        open={showCommandBar}
        onOpenChange={setShowCommandBar}
        onGenerateDraft={() => {
          if (conversation?.slug) {
            refreshDraft({ mailboxSlug, conversationSlug: conversation.slug });
            toast({
              title: "Generating draft...",
              variant: "success",
            });
          }
        }}
        onInsertReply={handleInsertReply}
        showCc={showCc}
        onToggleCc={onToggleCc}
      />
    </div>
  );
};

const EmailEditorComponent = React.forwardRef<
  TipTapEditorRef,
  {
    draftedEmail: DraftedEmail;
    initialMessage: { content: string };
    actionButtons: React.ReactNode;
    onSend: () => void;
    updateEmail: (changes: Partial<DraftedEmail>) => void;
    setShowCommandBar: (show: boolean) => void;
    showCc: boolean;
  }
>(({ draftedEmail, initialMessage, actionButtons, onSend, updateEmail, setShowCommandBar, showCc }, ref) => {
  const ccRef = useRef<HTMLInputElement>(null);
  const bccRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCc) {
      ccRef.current?.focus();
    }
  }, [showCc]);

  return (
    <div className="flex flex-col h-full">
      {showCc ? (
        <div className="flex-shrink-0 flex flex-col gap-2 mb-2">
          <LabeledInput
            ref={ccRef}
            name="CC"
            value={draftedEmail.cc}
            onChange={(cc) => updateEmail({ cc })}
            onModEnter={() => {}}
          />
          <LabeledInput
            ref={bccRef}
            name="BCC"
            value={draftedEmail.bcc}
            onChange={(bcc) => updateEmail({ bcc })}
            onModEnter={() => {}}
          />
        </div>
      ) : null}
      <div className="flex-grow overflow-auto relative">
        <TipTapEditor
          ref={ref}
          ariaLabel="Conversation editor"
          defaultContent={initialMessage}
          editable={true}
          onUpdate={(message, isEmpty) => updateEmail({ message: isEmpty ? "" : message })}
          onModEnter={onSend}
          onCommandK={() => setShowCommandBar(true)}
          enableImageUpload
          enableFileUpload
          className="pb-20"
        />
        {actionButtons}
      </div>
    </div>
  );
});

EmailEditorComponent.displayName = "EmailEditor";
