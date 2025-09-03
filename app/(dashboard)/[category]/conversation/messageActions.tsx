import { isMacOS } from "@tiptap/core";
import { CornerUpLeft, Eye, Lightbulb, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { create } from "zustand";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { FollowButton } from "@/app/(dashboard)/[category]/conversation/followButton";
import { EmailSignature } from "@/app/(dashboard)/[category]/emailSignature";
import { DraftedEmail } from "@/app/types/global";
import { triggerConfetti } from "@/components/confetti";
import { useFileUpload } from "@/components/fileUploadContext";
import { GenerateKnowledgeBankDialog } from "@/components/generateKnowledgeBankDialog";
import { useExpiringLocalStorage } from "@/components/hooks/use-expiring-local-storage";
import { useSpeechRecognition } from "@/components/hooks/useSpeechRecognition";
import { isInDialog } from "@/components/isInDialog";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import LabeledInput from "@/components/labeledInput";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useSession } from "@/components/useSession";
import { parseEmailList } from "@/components/utils/email";
import { publicConversationChannelId } from "@/lib/realtime/channels";
import { useBroadcastRealtimeEvent } from "@/lib/realtime/hooks";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useConversationListContext } from "../list/conversationListContext";
import { useConversationsListInput } from "../shared/queries";
import { TicketCommandBar } from "../ticketCommandBar";
import { useUndoneEmailStore } from "./useUndoneEmailStore";

export const FAILED_ATTACHMENTS_TOOLTIP_MESSAGE = "Remove the failed file attachments first";

export const isEmptyContent = (text: string | undefined) => {
  if (!text?.trim()) return true;
  const domParser = new DOMParser();
  const dom = domParser.parseFromString(text, "text/html");
  return !dom.documentElement.textContent && !dom.querySelector('img[src]:not([src=""])');
};

export const useSendDisabled = (message: string | undefined, conversationStatus?: string | null) => {
  const [sending, setSending] = useState(false);
  const { uploading, failedAttachmentsExist, hasReadyFileAttachments } = useFileUpload();

  const sendDisabled =
    sending ||
    (isEmptyContent(message) && !hasReadyFileAttachments) ||
    uploading ||
    failedAttachmentsExist ||
    conversationStatus === "closed" ||
    conversationStatus === "spam";
  return { sendDisabled, sending, setSending };
};

const useKnowledgeBankDialogState = create<
  ({ isVisible: false } | { isVisible: true; messageId: number }) & {
    show: (messageId: number) => void;
    hide: () => void;
  }
>((set) => ({
  isVisible: false,
  show: (messageId) => set({ isVisible: true, messageId }),
  hide: () => set({ isVisible: false }),
}));

export const useAlternateHotkeyInEditor = (normalKey: string, alternateKey: string, callback: () => void) => {
  useHotkeys(normalKey, callback, {
    preventDefault: true,
    enabled: () => !isInDialog(),
  });
  useHotkeys(alternateKey, callback, {
    enableOnContentEditable: true,
    enableOnFormTags: true,
    preventDefault: true,
    enabled: () => !isInDialog(),
  });
};

export const MessageActions = () => {
  const { navigateToConversation, removeConversation } = useConversationListContext();
  const { data: conversation, updateStatus } = useConversationContext();
  const { searchParams } = useConversationsListInput();
  const utils = api.useUtils();
  const { isAboveMd } = useBreakpoint("md");

  const broadcastEvent = useBroadcastRealtimeEvent();
  const lastTypingBroadcastRef = useRef<number>(0);

  const handleTypingEvent = useCallback(
    (conversationSlug: string) => {
      const now = Date.now();
      if (now - lastTypingBroadcastRef.current >= 8000) {
        broadcastEvent(publicConversationChannelId(conversationSlug), "agent-typing", {
          timestamp: now,
        });
        lastTypingBroadcastRef.current = now;
      }
    },
    [broadcastEvent],
  );

  const { user } = useSession() ?? {};

  const triggerMailboxConfetti = () => {
    if (!user?.preferences?.confetti) return;
    triggerConfetti();
  };

  const shouldAutoAssign = !!user?.preferences?.autoAssignOnReply && !conversation?.assignedToId;

  const replyMutation = api.mailbox.conversations.messages.reply.useMutation({
    onSuccess: async (_, variables) => {
      await utils.mailbox.conversations.get.invalidate({
        conversationSlug: variables.conversationSlug,
      });
    },
  });

  useHotkeys(
    "z",
    () => {
      if (conversation?.status === "closed" || conversation?.status === "spam") {
        updateStatus("open");
      }
    },
    { enabled: () => !isInDialog() },
  );

  useAlternateHotkeyInEditor("s", "mod+shift+s", () => {
    if (conversation?.status !== "spam") {
      updateStatus("spam");
    }
  });

  useAlternateHotkeyInEditor("c", "mod+shift+c", () => {
    if (conversation?.status !== "closed") {
      updateStatus("closed");
    }
  });

  const storageKey = `draft/${conversation?.slug}`;
  const [storedMessage, setStoredMessage] = useExpiringLocalStorage<string>(storageKey, {
    shouldStore: (value) => !!conversation?.slug && !isEmptyContent(value),
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
      editorRef.current?.editor?.commands.setContent(message);
    }
  }, [conversation?.draft?.id]);

  useEffect(() => {
    if (storedMessage && !draftedEmail.modified) {
      setInitialMessageObject({ content: storedMessage });
      setDraftedEmail((prev) => ({ ...prev, message: storedMessage, modified: true }));
    }
  }, [storedMessage]);

  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showCc, setShowCc] = useState(draftedEmail.cc.length > 0 || draftedEmail.bcc.length > 0);
  const ccRef = useRef<HTMLInputElement>(null);
  const bccRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TipTapEditorRef | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  useEffect(() => {
    if (showCc) {
      ccRef.current?.focus();
    }
  }, [showCc]);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const onToggleCc = useCallback(() => setShowCc((prev) => !prev), []);

  const handleSegment = useCallback((segment: string) => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.insertContent(segment);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error(`Speech Recognition Error`, {
      description: error,
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
  const { sendDisabled, sending, setSending } = useSendDisabled(draftedEmail.message, conversation?.status);

  useEffect(() => {
    if (!conversation || !undoneEmail) return;

    const hasUnsavedChanges = draftedEmail.modified && !isEmptyContent(draftedEmail.message);

    if (hasUnsavedChanges) {
      const shouldOverwrite = confirm(
        "You have unsaved changes that will be lost. Do you want to continue with restoring the unsent message?",
      );

      if (!shouldOverwrite) {
        setUndoneEmail(undefined);
        return;
      }
    }

    setDraftedEmail({ ...undoneEmail, modified: true });
    setInitialMessageObject({ content: undoneEmail.message });
    resetFiles(undoneEmail.files);

    if (editorRef.current?.editor && !editorRef.current.editor.isDestroyed) {
      editorRef.current.editor.commands.setContent(undoneEmail.message);
    }

    setUndoneEmail(undefined);
  }, [undoneEmail, conversation]);

  const knowledgeBankDialogState = useKnowledgeBankDialogState();

  const handleSend = async ({ assign, close = true }: { assign: boolean; close?: boolean }) => {
    if (sendDisabled || !conversation?.slug) return;

    stopRecording();
    setSending(true);
    const originalDraftedEmail = { ...draftedEmail, files: readyFiles };

    try {
      const cc = parseEmailList(draftedEmail.cc);
      if (!cc.success)
        return toast.error(`Invalid CC email address: ${cc.error.issues.map((issue) => issue.message).join(", ")}`);

      const bcc = parseEmailList(draftedEmail.bcc);
      if (!bcc.success)
        return toast.error(`Invalid BCC email address: ${bcc.error.issues.map((issue) => issue.message).join(", ")}`);

      const conversationSlug = conversation.slug;

      const lastUserMessage = conversation.messages
        ?.filter((m) => m.type === "message" && m.role === "user")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const { id: emailId } = await replyMutation.mutateAsync({
        conversationSlug,
        message: draftedEmail.message,
        fileSlugs: readyFiles.flatMap((f) => (f.slug ? [f.slug] : [])),
        cc: cc.data,
        bcc: bcc.data,
        shouldAutoAssign: assign,
        shouldClose: close,
        responseToId: lastUserMessage?.id ?? null,
      });

      // Clear the draft immediately after message is sent successfully
      setDraftedEmail((prev) => ({ ...prev, message: "", files: [], modified: false }));
      setInitialMessageObject({ content: "" });
      resetFiles([]);
      setStoredMessage("");
      setShowCommandBar(false);

      try {
        if (editorRef.current?.editor && !editorRef.current.editor.isDestroyed) {
          editorRef.current.editor.commands.clearContent();
        }
      } catch (error) {
        captureExceptionAndLog(error);
      }

      // Handle status update separately - if this fails, draft is already cleared
      let shouldTriggerConfetti = false;
      if (conversation.status === "open" && close) {
        try {
          // Use direct update to avoid redundant toast since we're already showing "Replied and closed"
          await utils.client.mailbox.conversations.update.mutate({
            conversationSlug,
            status: "closed",
          });
          // Remove conversation from list and move to next
          removeConversation();
          if (!assign) shouldTriggerConfetti = true;
        } catch (error) {
          captureExceptionAndLog(error);
          toast.error("Message sent but failed to close conversation", {
            description: "The message was sent successfully, but there was an error closing the conversation.",
          });
        }
      }

      if (shouldTriggerConfetti) {
        triggerMailboxConfetti();
      }
      toast.success(close ? "Replied and closed" : "Message sent!", {
        duration: 10000,
        description: (
          <div className="flex gap-2 items-center mt-2">
            {close && (
              <button
                className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded-md border hover:bg-accent transition-colors"
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey) {
                    window.open(`/conversations?id=${conversation.slug}`, "_blank");
                  } else {
                    navigateToConversation(conversation.slug);
                  }
                }}
              >
                <Eye className="h-3 w-3" />
                Visit
              </button>
            )}
            <button
              className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded-md border hover:bg-accent transition-colors"
              onClick={() => knowledgeBankDialogState.show(emailId)}
            >
              <Lightbulb className="h-3 w-3" />
              Generate knowledge
            </button>
            <button
              className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded-md border hover:bg-accent transition-colors"
              onClick={async () => {
                try {
                  await utils.client.mailbox.conversations.undo.mutate({
                    conversationSlug,
                    emailId,
                  });
                  setUndoneEmail(originalDraftedEmail);
                  toast.success("Message unsent");
                } catch (e) {
                  captureExceptionAndLog(e);
                  toast.error("Failed to unsend email", {
                    description: e instanceof Error ? e.message : "Unknown error",
                  });
                } finally {
                  utils.mailbox.conversations.get.invalidate({ conversationSlug });
                  navigateToConversation(conversation.slug);
                }
              }}
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
          </div>
        ),
      });
    } catch (error) {
      captureExceptionAndLog(error);
      toast.error("Error submitting message");
    } finally {
      setSending(false);
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
                onClick={() => updateStatus("closed")}
                disabled={conversation?.status === "closed"}
              >
                Close
                {isMacOS() && (
                  <KeyboardShortcut className="ml-2 text-sm border-primary/50">
                    {isEditorFocused ? "⌘⇧C" : "C"}
                  </KeyboardShortcut>
                )}
              </Button>
              <Button
                size={isAboveMd ? "default" : "sm"}
                variant="outlined"
                onClick={() => handleSend({ assign: shouldAutoAssign, close: false })}
                disabled={sendDisabled}
              >
                Reply
                {!sending && isMacOS() && (
                  <KeyboardShortcut className="ml-2 text-sm border-primary/50">⌥⏎</KeyboardShortcut>
                )}
              </Button>
              <Button
                size={isAboveMd ? "default" : "sm"}
                onClick={() => handleSend({ assign: shouldAutoAssign })}
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

  const followButton = conversation?.slug ? (
    <FollowButton conversationSlug={conversation.slug} size={isAboveMd ? "default" : "sm"} />
  ) : null;

  const updateDraftedEmail = (changes: Partial<DraftedEmail>) => {
    setDraftedEmail((email) => ({ ...email, ...changes, modified: true }));
    setStoredMessage(changes.message);
  };

  const handleInsertReply = (content: string) => {
    editorRef.current?.editor?.commands.insertContent(content);
    editorRef.current?.editor?.commands.focus();
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
        onFocusChange={setIsEditorFocused}
        onUpdate={(message, isEmpty) => {
          updateDraftedEmail({ message: isEmpty ? "" : message });
          if (!isEmpty && conversation?.slug) {
            handleTypingEvent(conversation.slug);
          }
        }}
        onModEnter={() => !sendDisabled && handleSend({ assign: shouldAutoAssign })}
        onOptionEnter={() => !sendDisabled && handleSend({ assign: shouldAutoAssign, close: false })}
        onSlashKey={() => {
          setShowCommandBar(true);
          setTimeout(() => commandInputRef.current?.focus(), 100);
        }}
        enableImageUpload
        enableFileUpload
        actionButtons={actionButtons}
        followButton={followButton}
        signature={<EmailSignature />}
        isRecordingSupported={isRecordingSupported}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
      />
      {knowledgeBankDialogState.isVisible && (
        <GenerateKnowledgeBankDialog
          open={knowledgeBankDialogState.isVisible}
          onOpenChange={(open) => !open && knowledgeBankDialogState.hide()}
          messageId={knowledgeBankDialogState.messageId}
        />
      )}
    </div>
  );
};
