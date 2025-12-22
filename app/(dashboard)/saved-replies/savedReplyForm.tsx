import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { isEmptyContent } from "@/app/(dashboard)/[category]/conversation/messageActions";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { useSpeechRecognition } from "@/components/hooks/useSpeechRecognition";
import TipTapEditor, { type TipTapEditorRef } from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

type SavedReply = {
  slug: string;
  name: string;
  content: string;
};

interface SavedReplyFormProps {
  savedReply?: SavedReply;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function SavedReplyForm({ savedReply, onSuccess, onCancel, onDelete }: SavedReplyFormProps) {
  const editorRef = useRef<TipTapEditorRef | null>(null);
  const [initialContentObject, setInitialContentObject] = useState({ content: savedReply?.content || "" });

  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
        content: z.string().min(1, "Content is required"),
      }),
    ),
    defaultValues: {
      name: savedReply?.name || "",
      content: savedReply?.content || "",
    },
  });

  const handleSegment = useCallback((segment: string) => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.insertContent(segment);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error("Speech Recognition Error", { description: error });
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

  const createSavedReply = api.mailbox.savedReplies.create.useMutation({
    onSuccess: () => {
      onSuccess();
      form.reset();
      setInitialContentObject({ content: "" });
    },
    onError: (error) => {
      toast.error("Failed to create saved reply", { description: error.message });
    },
  });

  const updateSavedReply = api.mailbox.savedReplies.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error("Failed to update saved reply", { description: error.message });
    },
  });

  const deleteSavedReply = api.mailbox.savedReplies.delete.useMutation({
    onSuccess: () => {
      toast.success("Saved reply deleted successfully");
      onDelete?.();
    },
    onError: (error) => {
      toast.error("Failed to delete saved reply", { description: error.message });
    },
  });

  const onSubmit = (data: { name: string; content: string }) => {
    const finalData = {
      ...data,
    };

    if (savedReply) {
      updateSavedReply.mutate({ slug: savedReply.slug, ...finalData });
    } else {
      createSavedReply.mutate(finalData);
    }
  };

  const handleDelete = () => {
    if (savedReply) {
      deleteSavedReply.mutate({ slug: savedReply.slug });
    }
  };

  const handleEditorUpdate = (content: string, isEmpty: boolean) => {
    const isContentEmpty = isEmpty || isEmptyContent(content);
    form.setValue("content", isContentEmpty ? "" : content, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-x-auto">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Welcome Message" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={() => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <TipTapEditor
                  ref={editorRef}
                  className="min-h-48 max-h-96"
                  ariaLabel="Saved reply content editor"
                  placeholder="Enter your saved reply content here..."
                  defaultContent={initialContentObject}
                  editable={true}
                  onUpdate={handleEditorUpdate}
                  enableImageUpload={false}
                  enableFileUpload={false}
                  isRecordingSupported={isRecordingSupported}
                  isRecording={isRecording}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center">
          {savedReply && onDelete ? (
            <ConfirmationDialog
              message={`Are you sure you want to delete ${savedReply.name}? This action cannot be undone.`}
              onConfirm={handleDelete}
            >
              <Button type="button" variant="destructive_outlined" disabled={deleteSavedReply.isPending}>
                Delete
              </Button>
            </ConfirmationDialog>
          ) : null}

          <div className="ml-auto flex items-center space-x-2">
            <Button type="button" variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSavedReply.isPending || updateSavedReply.isPending}>
              {createSavedReply.isPending || updateSavedReply.isPending ? "Saving..." : savedReply ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
