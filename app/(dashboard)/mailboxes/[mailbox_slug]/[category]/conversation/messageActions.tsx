import { isMacOS } from "@tiptap/core";
import { CornerUpLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { DraftedEmail } from "@/app/types/global";
import { triggerConfetti } from "@/components/confetti";
import { useFileUpload } from "@/components/fileUploadContext";
import { useExpiringLocalStorage } from "@/components/hooks/use-expiring-local-storage";
import { toast } from "@/components/hooks/use-toast";
import { useSpeechRecognition } from "@/components/hooks/useSpeechRecognition";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import LabeledInput from "@/components/labeledInput";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useBreakpoint } from "@/components/useBreakpoint";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { useSession } from "@/components/useSession";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useConversationListContext } from "../list/conversationListContext";
import { useConversationsListInput } from "../shared/queries";
import { TicketCommandBar } from "../ticketCommandBar";
import { useUndoneEmailStore } from "./conversation";

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
  const { isAboveMd } = useBreakpoint("md");

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

  const { user } = useSession() ?? {};
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showCc, setShowCc] = useState(draftedEmail.cc.length > 0 || draftedEmail.bcc.length > 0);
  const ccRef = useRef<HTMLInputElement>(null);
  const bccRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TipTapEditorRef | null>(null);

  useEffect(() => {
    if (showCc) {
      ccRef.current?.focus();
    }
  }, [showCc]);

  const onToggleCc = useCallback(() => setShowCc((prev) => !prev), []);

  const handleSegment = useCallback((segment: string) => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.insertContent(segment);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast({
      title: "Speech Recognition Error",
      description: error,
      variant: "destructive",
    });
  }, []);

  const {
    isSupported: isRecordingSupported,
    isRecording,
    startRecording,
    stopRecording,
  } = useSpeechRecognition({
    onSegment: handleSegment,
    onError: handleError,
  });

  const { readyFiles, resetFiles } = useFileUpload();
  const { sendDisabled, sending, setSending } = useSendDisabled(draftedEmail.message);

  const handleSend = async ({ assign, close = true }: { assign: boolean; close?: boolean }) => {
    if (sendDisabled || !conversation?.slug) return;

    stopRecording();
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
      <div className="flex items-center gap-4 md:flex-row-reverse">
        {(conversation?.status ?? searchParams.status) !== "spam" &&
          ((conversation?.status ?? searchParams.status) === "closed" ? (
            <Button variant="outlined" onClick={() => updateStatus("open")}>
              <CornerUpLeft className="mr-2 h-4 w-4" />
              Reopen
            </Button>
          ) : (
            <>
              <Button
                size={isAboveMd ? "default" : "sm"}
                variant="outlined"
                onClick={() => handleSend({ assign: false, close: false })}
                disabled={sendDisabled}
              >
                Reply
                {!sending && isMacOS() && (
                  <KeyboardShortcut className="ml-2 text-sm border-primary/50">⌥⏎</KeyboardShortcut>
                )}
              </Button>
              <Button
                size={isAboveMd ? "default" : "sm"}
                onClick={() => handleSend({ assign: false })}
                disabled={sendDisabled}
              >
                {sending ? "Replying..." : "Reply and close"}
                {!sending && isMacOS() && (
                  <KeyboardShortcut className="ml-2 text-sm border-bright-foreground/50">⌘⏎</KeyboardShortcut>
                )}
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
  };

  return (
    <div className="flex flex-col h-full pt-4">
      <TicketCommandBar
        open={showCommandBar}
        onOpenChange={setShowCommandBar}
        onInsertReply={handleInsertReply}
        onToggleCc={onToggleCc}
        inputRef={commandInputRef}
      />
      <div className={cn("shrink-0 grid grid-cols-2 gap-2 mt-4", (!showCc || showCommandBar) && "hidden")}>
        <LabeledInput
          ref={ccRef}
          name="CC"
          value={draftedEmail.cc}
          onChange={(cc) => updateDraftedEmail({ cc })}
          onModEnter={() => {}}
        />
        <LabeledInput
          ref={bccRef}
          name="BCC"
          value={draftedEmail.bcc}
          onChange={(bcc) => updateDraftedEmail({ bcc })}
          onModEnter={() => {}}
        />
      </div>
      <TipTapEditor
        ref={editorRef}
        className={cn("flex-1 min-h-0 my-2 md:my-4", showCommandBar && "hidden")}
        ariaLabel="Conversation editor"
        placeholder="Type your reply here..."
        defaultContent={initialMessageObject}
        editable={true}
        onUpdate={(message, isEmpty) => updateDraftedEmail({ message: isEmpty ? "" : message })}
        onModEnter={() => handleSend({ assign: false })}
        onOptionEnter={() => handleSend({ assign: false, close: false })}
        onSlashKey={() => commandInputRef.current?.focus()}
        enableImageUpload
        enableFileUpload
        actionButtons={actionButtons}
        signature={
          user?.user_metadata.name ? (
            <div className="mt-1 text-muted-foreground">
              Best,
              <br />
              {user.user_metadata.name}
              <div className="text-xs mt-2">
                Note: This signature will be automatically included in email responses, but not in live chat
                conversations.
              </div>
            </div>
          ) : null
        }
        isRecordingSupported={isRecordingSupported}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
      />
    </div>
  );
};
