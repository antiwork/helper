import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { FileUploadProvider, UploadStatus, useFileUpload } from "@/components/fileUploadContext";
import FileAttachment from "@/components/tiptap/fileAttachment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type NotesPageProps = {
  onOpenChange: (open: boolean) => void;
};

const NotesPageContent = ({ onOpenChange }: NotesPageProps) => {
  const { conversationSlug } = useConversationContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = api.useUtils();
  const { unsavedFiles, onUpload, onRetry } = useFileUpload();
  const attachments = unsavedFiles.filter((f) => !f.inline);

  const addNote = api.mailbox.conversations.notes.add.useMutation({
    onSuccess: () => {
      if (textareaRef.current) textareaRef.current.value = "";
      utils.mailbox.conversations.get.invalidate({
        conversationSlug,
      });
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    const message = textareaRef.current?.value.trim();
    if (!message) return;

    const fileSlugs = attachments
      .filter((f) => f.status === UploadStatus.UPLOADED && f.slug)
      .map((f) => f.slug!)
      .filter(Boolean);

    setIsSubmitting(true);
    addNote.mutate(
      {
        conversationSlug,
        message,
        fileSlugs,
      },
      {
        onSettled: () => setIsSubmitting(false),
      },
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      onUpload(file, { inline: false }).upload.catch((message: string | null) =>
        toast.error(message ?? `Failed to upload ${file.name}`),
      );
    }
    event.target.value = "";
  };

  const retryUpload = (file: File) =>
    onRetry(file).upload.catch((message: string | null) => toast.error(message ?? `Failed to upload ${file.name}`));

  return (
    <div className="flex-1 flex flex-col p-4">
      <h3 className="font-medium mb-4">Add Internal Note</h3>
      <Textarea
        ref={textareaRef}
        className="min-h-24 mb-4 flex-1"
        placeholder="Type your note here..."
        autoFocus
        aria-label="Internal Note"
      />
      {attachments.length > 0 && (
        <div className="mb-4 flex w-full flex-wrap gap-2">
          {attachments.map((fileInfo, idx) => (
            <FileAttachment key={idx} fileInfo={fileInfo} onRetry={retryUpload} />
          ))}
        </div>
      )}
      <div className="flex justify-between">
        <Button size="sm" variant="ghost" className="relative">
          <input
            type="file"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleFileUpload}
            multiple
          />
          <Paperclip className="h-4 w-4 mr-1" />
          Attach files
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          Add internal note
        </Button>
      </div>
    </div>
  );
};

export const NotesPage = (props: NotesPageProps) => {
  const { conversationSlug } = useConversationContext();
  return (
    <FileUploadProvider conversationSlug={conversationSlug}>
      <NotesPageContent {...props} />
    </FileUploadProvider>
  );
};
