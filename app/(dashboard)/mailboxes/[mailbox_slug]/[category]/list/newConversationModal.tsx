import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FAILED_ATTACHMENTS_TOOLTIP_MESSAGE,
  useSendDisabled,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageActions";
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

    const cc = parseEmailList(newConversationInfo.cc, (invalidEmail) => {
      toast({
        variant: "destructive",
        title: `Invalid CC email address: ${invalidEmail}`,
      });
    });
    if (cc === null) return;

    const bcc = parseEmailList(newConversationInfo.bcc, (invalidEmail) => {
      toast({
        variant: "destructive",
        title: `Invalid BCC email address: ${invalidEmail}`,
      });
    });
    if (bcc === null) return;

    const parsedNewConversationInfo: RouterInputs["mailbox"]["conversations"]["create"]["conversation"] = {
      conversation_slug: conversationSlug,
      to_email_address: toEmailAddress,
      subject: newConversationInfo.subject.trim(),
      message: newConversationInfo.message.trim(),
      cc,
      bcc,
      file_slugs: readyFiles.flatMap((f) => (f.slug ? [f.slug] : [])),
    };

    await createNewConversation({ mailboxSlug, conversation: parsedNewConversationInfo });
  };
  const sendButton = (
    <Button disabled={sendDisabled} onClick={sendMessage}>
      {sending ? "Sending..." : "Send"}
    </Button>
  );

  return (
    <>
      <div className="grid gap-4">
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
        <CcAndBccInfo
          newConversationInfo={newConversationInfo}
          onChange={(changes) => setNewConversationInfo((info) => ({ ...info, ...changes }))}
          onModEnter={sendMessage}
        />
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
        <div className="min-h-[10rem]">
          <TipTapEditor
            ref={editorRef}
            ariaLabel="Message"
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
            isRecordingSupported={isRecordingSupported}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        </div>
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
  const [ccVisible, setCcVisible] = useState(false);
  const [bccVisible, setBccVisible] = useState(false);
  const ccRef = useRef<HTMLInputElement>(null);
  const bccRef = useRef<HTMLInputElement>(null);
  const CcButton = () => (
    <button
      onClick={() => {
        setCcVisible(true);
      }}
      className="text-foreground text-sm hover:underline"
    >
      CC
    </button>
  );
  const BccButton = () => (
    <button
      onClick={() => {
        setBccVisible(true);
      }}
      className="text-foreground text-sm hover:underline"
    >
      BCC
    </button>
  );
  useEffect(() => ccRef.current?.focus(), [ccVisible]);
  useEffect(() => bccRef.current?.focus(), [bccVisible]);

  return (
    <div className={ccVisible && bccVisible ? "flex flex-col gap-2" : "flex gap-2"}>
      {!ccVisible && !bccVisible ? (
        <span className="text-sm text-muted-foreground">
          Add <CcButton /> or <BccButton />
        </span>
      ) : null}
      {ccVisible && (
        <LabeledInput
          ref={ccRef}
          name="CC"
          value={newConversationInfo.cc}
          onChange={(cc) => onChange({ cc })}
          onModEnter={onModEnter}
        />
      )}
      {!ccVisible && bccVisible ? <CcButton /> : null}
      {bccVisible && (
        <LabeledInput
          ref={bccRef}
          name="BCC"
          value={newConversationInfo.bcc}
          onChange={(bcc) => onChange({ bcc })}
          onModEnter={onModEnter}
        />
      )}
      {!bccVisible && ccVisible ? <BccButton /> : null}
    </div>
  );
};

const Wrapper = ({ mailboxSlug, conversationSlug, onSubmit }: Props) => (
  <FileUploadProvider mailboxSlug={mailboxSlug} conversationSlug={conversationSlug}>
    <NewConversationModal mailboxSlug={mailboxSlug} conversationSlug={conversationSlug} onSubmit={onSubmit} />
  </FileUploadProvider>
);

export default Wrapper;
