import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Conversation, Note as NoteType } from "@/app/types/global";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

interface NoteEditorProps {
  conversation: Conversation;
  note: NoteType;
  isEditing: boolean;
  onCancelEdit: () => void;
  children: React.ReactNode;
}

export const NoteEditor = ({ conversation, note, isEditing, onCancelEdit, children }: NoteEditorProps) => {
  const [editContent, setEditContent] = useState(note.body);
  const utils = api.useUtils();

  const updateNoteMutation = api.mailbox.conversations.notes.update.useMutation({
    onSuccess: () => {
      onCancelEdit();
      utils.mailbox.conversations.get.invalidate({
        conversationSlug: conversation.slug,
      });
      toast.success("Note updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update note", { description: error.message });
    },
  });

  const handleSaveEdit = () => {
    if (editContent?.trim()) {
      updateNoteMutation.mutate({
        conversationSlug: conversation.slug,
        noteId: note.id,
        message: editContent.trim(),
      });
    }
  };

  const handleCancelEdit = () => {
    onCancelEdit();
    setEditContent(note.body);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editContent || ""}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-20 resize-none"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSaveEdit} disabled={updateNoteMutation.isPending || !editContent?.trim()}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={updateNoteMutation.isPending}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
