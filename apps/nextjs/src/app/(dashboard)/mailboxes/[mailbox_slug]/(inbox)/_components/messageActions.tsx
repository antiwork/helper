import { useUser } from "@clerk/nextjs";
import { ArrowUturnUpIcon } from "@heroicons/react/20/solid";
import { isMacOS } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationContext";
import { triggerConfetti } from "@/components/confetti";
import { useFileUpload } from "@/components/fileUploadContext";
import { useExpiringLocalStorage } from "@/components/hooks/use-expiring-local-storage";
import { toast } from "@/components/hooks/use-toast";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import LabeledInput from "@/components/labeledInput";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import type { DraftedEmail } from "@/serverActions/messages";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useUndoneEmailStore } from "./conversation";
import { useConversationListContext } from "./conversationListContext";
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

  const { data: mailboxPreferences } = api.mailbox.preferences.get.useQuery({
    mailboxSlug,
  });

  const triggerMailboxConfetti = () => {
    if (!mailboxPreferences?.preferences?.confetti) return;
    triggerConfetti();
  };

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
        if (!assign) triggerMailboxConfetti();
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
                  captureExceptionAndLog(e);
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
      captureExceptionAndLog(error);
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

  const actionButtons = (
    <>
      <div className="flex items-center gap-4">
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
                {!sending && isMacOS() && (
                  <KeyboardShortcut className="ml-2 text-sm border-bright-foreground/50">⌘⏎</KeyboardShortcut>
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSend({ assign: false, close: false })}
                disabled={sendDisabled}
              >
                Reply
              </Button>
            </>
          ))}
      </div>
    </>
  );

  const updateDraftedEmail = (changes: Partial<DraftedEmail>) => {
    setDraftedEmail((email) => ({ ...email, ...changes, modified: true }));
    setStoredMessage(changes.message);
  };

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
    <EmailEditorComponent
      ref={editorRef}
      onSend={() => handleSend({ assign: false })}
      actionButtons={actionButtons}
      draftedEmail={draftedEmail}
      initialMessage={initialMessageObject}
      updateEmail={updateDraftedEmail}
      handleInsertReply={handleInsertReply}
    />
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
    handleInsertReply: (content: string) => void;
  }
>(({ draftedEmail, initialMessage, actionButtons, onSend, updateEmail, handleInsertReply }, ref) => {
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showCc, setShowCc] = useState(draftedEmail.cc.length > 0 || draftedEmail.bcc.length > 0);
  const ccRef = useRef<HTMLInputElement>(null);
  const bccRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  const onToggleCc = useCallback(() => setShowCc(!showCc), [showCc]);

  useEffect(() => {
    if (showCc) {
      ccRef.current?.focus();
    }
  }, [showCc]);

  return (
    <div className="flex flex-col h-full pt-4">
      <TicketCommandBar
        open={showCommandBar}
        onOpenChange={setShowCommandBar}
        onInsertReply={handleInsertReply}
        onToggleCc={onToggleCc}
        inputRef={commandInputRef}
      />
      <div className={cn("flex-shrink-0 flex flex-col gap-2 mt-4", (!showCc || showCommandBar) && "hidden")}>
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
      <div className={cn("flex-grow overflow-auto relative my-2 md:my-4", showCommandBar && "hidden")}>
        <TipTapEditor
          ref={ref}
          ariaLabel="Conversation editor"
          placeholder="Type your reply here..."
          defaultContent={initialMessage}
          editable={true}
          onUpdate={(message, isEmpty) => updateEmail({ message: isEmpty ? "" : message })}
          onModEnter={onSend}
          onSlashKey={() => commandInputRef.current?.focus()}
          enableImageUpload
          enableFileUpload
          signature={
            user?.firstName ? (
              <div className="mt-6 text-muted-foreground">
                Best,
                <br />
                {user.firstName}
                <div className="text-xs mt-2">
                  Note: This signature will be automatically included in email responses, but not in live chat
                  conversations.
                </div>
              </div>
            ) : null
          }
        />
      </div>
      <div className={showCommandBar ? "hidden" : ""}>{actionButtons}</div>
    </div>
  );
});

EmailEditorComponent.displayName = "EmailEditor";
