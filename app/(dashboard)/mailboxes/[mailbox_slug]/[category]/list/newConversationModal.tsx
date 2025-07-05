import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FAILED_ATTACHMENTS_TOOLTIP_MESSAGE,
  useSendDisabled,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageActions";
import { EmailSignature } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/emailSignature";
import { DraftedEmail } from "@/app/types/global";
import { FileUploadProvider, useFileUpload } from "@/components/fileUploadContext";
import { toast } from "@/components/hooks/use-toast";
import { useSpeechRecognition } from "@/components/hooks/useSpeechRecognition";
import LabeledInput from "@/components/labeledInput";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseEmailList } from "@/components/utils/email";
import { parseEmailAddress } from "@/lib/emails";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import { RouterInputs } from "@/trpc";
import { api } from "@/trpc/react";

type NewConversationInfo = {
  to_email_address: string;
  subject: string;
} & DraftedEmail;

type Props = {
  mailboxSlug: string;
  conversationSlug: string;
  onSubmit: () => void;
};

const NewConversationModal = ({ mailboxSlug, conversationSlug, onSubmit }: Props) => {
  const { readyFiles, failedAttachmentsExist } = useFileUpload();
  const messageMemoized = useMemo(() => ({ content: "" }), []);
  const [newConversationInfo, setNewConversationInfo] = useState<NewConversationInfo>({
    to_email_address: "",
    subject: "",
    message: "",
    cc: "",
    bcc: "",
    files: [],
  });

  const { sendDisabled, sending, setSending } = useSendDisabled(newConversationInfo.message);
  const editorRef = useRef<TipTapEditorRef | null>(null);

  const handleSegment = useCallback(
    (segment: string) => {
      if (editorRef.current?.editor) {
        editorRef.current.editor.commands.insertContent(segment);
      }
    },
    [editorRef],
  );

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

  const router = useRouter();
  const { mutateAsync: createNewConversation } = api.mailbox.conversations.create.useMutation({
    onMutate: () => setSending(true),
    onSuccess: () => {
      router.refresh();
      toast({
        title: "Message sent",
        variant: "success",
      });
      onSubmit();
    },
    onError: (e) => {
      captureExceptionAndLog(e);
      toast({
        title: "Failed to create conversation",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSending(false);
    },
  });

  const sendMessage = async () => {
    if (sendDisabled) return;
    stopRecording();

    const toEmailAddress = parseEmailAddress(newConversationInfo.to_email_address.trim())?.address;
    if (!toEmailAddress)
      return toast({
        variant: "destructive",
        title: 'Please enter a valid "To" email address',
      });

    const cc = parseEmailList(newConversationInfo.cc);
    if (!cc.success)
      return toast({
        variant: "destructive",
        title: `Invalid CC email address: ${cc.error.issues.map((issue) => issue.message).join(", ")}`,
      });

    const bcc = parseEmailList(newConversationInfo.bcc);
    if (!bcc.success)
      return toast({
        variant: "destructive",
        title: `Invalid BCC email address: ${bcc.error.issues.map((issue) => issue.message).join(", ")}`,
      });

    const parsedNewConversationInfo: RouterInputs["mailbox"]["conversations"]["create"]["conversation"] = {
      conversation_slug: conversationSlug,
      to_email_address: toEmailAddress,
      subject: newConversationInfo.subject.trim(),
      message: newConversationInfo.message.trim(),
      cc: cc.data,
      bcc: bcc.data,
      file_slugs: readyFiles.flatMap((f) => (f.slug ? [f.slug] : [])),
    };

    await createNewConversation({ mailboxSlug, conversation: parsedNewConversationInfo });
  };
  const sendButton = (
    <Button disabled={sendDisabled} onClick={sendMessage}>
      {sending ? "Sending..." : "Send"}
    </Button>
  );

  const [showCcBcc, setShowCcBcc] = useState(false);

  return (
    <>
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LabeledInput
              name="To"
              value={newConversationInfo.to_email_address}
              onChange={(to_email_address) =>
                setNewConversationInfo((newConversationInfo) => ({
                  ...newConversationInfo,
                  to_email_address,
                }))
              }
              onModEnter={sendMessage}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCcBcc(!showCcBcc);
              if (showCcBcc) {
                // Clear CC/BCC when hiding
                setNewConversationInfo((info) => ({ ...info, cc: "", bcc: "" }));
              }
            }}
            className="h-8 w-8 p-0 hover:bg-muted self-end"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showCcBcc && "rotate-180")} />
          </Button>
        </div>
        {showCcBcc && (
          <CcAndBccInfo
            newConversationInfo={newConversationInfo}
            onChange={(changes) => setNewConversationInfo((info) => ({ ...info, ...changes }))}
            onModEnter={sendMessage}
          />
        )}
        <Input
          name="Subject"
          value={newConversationInfo.subject}
          placeholder="Subject"
          onChange={(e) =>
            setNewConversationInfo((newConversationInfo) => ({
              ...newConversationInfo,
              subject: e.target.value,
            }))
          }
          onModEnter={sendMessage}
        />
        <TipTapEditor
          ref={editorRef}
          className="max-h-[400px] overflow-y-auto no-scrollbar"
          ariaLabel="Message"
          placeholder="Type your message here..."
          defaultContent={messageMemoized}
          onModEnter={sendMessage}
          onUpdate={(message, isEmpty) =>
            setNewConversationInfo((info) => ({
              ...info,
              message: isEmpty ? "" : message,
            }))
          }
          enableImageUpload
          enableFileUpload
          signature={<EmailSignature />}
          isRecordingSupported={isRecordingSupported}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
        />
      </div>

      <DialogFooter>
        {failedAttachmentsExist ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{sendButton}</div>
              </TooltipTrigger>
              <TooltipContent align="end" className="w-52 text-center">
                {FAILED_ATTACHMENTS_TOOLTIP_MESSAGE}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          sendButton
        )}
      </DialogFooter>
    </>
  );
};

const CcAndBccInfo = ({
  newConversationInfo,
  onChange,
  onModEnter,
}: {
  newConversationInfo: NewConversationInfo;
  onChange: (info: Partial<NewConversationInfo>) => void;
  onModEnter?: () => void;
}) => {
  const ccRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ccRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <LabeledInput
        ref={ccRef}
        name="CC"
        value={newConversationInfo.cc}
        onChange={(cc) => onChange({ cc })}
        onModEnter={onModEnter}
      />
      <LabeledInput
        name="BCC"
        value={newConversationInfo.bcc}
        onChange={(bcc) => onChange({ bcc })}
        onModEnter={onModEnter}
      />
    </div>
  );
};

const Wrapper = ({ mailboxSlug, conversationSlug, onSubmit }: Props) => (
  <FileUploadProvider conversationSlug={conversationSlug}>
    <NewConversationModal mailboxSlug={mailboxSlug} conversationSlug={conversationSlug} onSubmit={onSubmit} />
  </FileUploadProvider>
);

export default Wrapper;
