import { Lightbulb, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type GenerateKnowledgeBankDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: number;
  mailboxSlug: string;
};

export const GenerateKnowledgeBankDialog = ({
  open,
  onOpenChange,
  messageId,
  mailboxSlug,
}: GenerateKnowledgeBankDialogProps) => {
  const [suggestedContent, setSuggestedContent] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [suggestionReason, setSuggestionReason] = useState<string>("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [updateEntryId, setUpdateEntryId] = useState<number | null>(null);

  const utils = api.useUtils();

  const generateSuggestionMutation = api.mailbox.faqs.suggestFromHumanReply.useMutation({
    onSuccess: (data) => {
      if (data.action === "create_entry" || data.action === "update_entry") {
        setSuggestedContent(data.content || "");
        setEditedContent(data.content || "");
        setSuggestionReason(data.reason);
        setUpdateEntryId(data.entryId || null);
        setHasGenerated(true);
      } else {
        toast({
          title: "No knowledge entry needed",
          description: data.reason,
        });
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error generating suggestion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createKnowledgeMutation = api.mailbox.faqs.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Knowledge bank entry created!",
        variant: "success",
      });
      utils.mailbox.faqs.list.invalidate({ mailboxSlug });
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      toast({
        title: "Error creating knowledge entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateKnowledgeMutation = api.mailbox.faqs.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Knowledge bank entry updated!",
        variant: "success",
      });
      utils.mailbox.faqs.list.invalidate({ mailboxSlug });
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      toast({
        title: "Error updating knowledge entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetState = () => {
    setSuggestedContent("");
    setEditedContent("");
    setSuggestionReason("");
    setHasGenerated(false);
    setUpdateEntryId(null);
  };

  // Auto-run AI suggestion when dialog opens
  useEffect(() => {
    if (open && messageId && !hasGenerated && !generateSuggestionMutation.isPending) {
      generateSuggestionMutation.mutate({ mailboxSlug, messageId });
    }
  }, [open, messageId, hasGenerated, mailboxSlug]);

  const handleSave = () => {
    if (!editedContent.trim()) {
      toast({
        title: "Content required",
        description: "Please enter content for the knowledge bank entry",
        variant: "destructive",
      });
      return;
    }

    if (updateEntryId) {
      updateKnowledgeMutation.mutate({
        mailboxSlug,
        id: updateEntryId,
        content: editedContent,
      });
    } else {
      createKnowledgeMutation.mutate({
        mailboxSlug,
        content: editedContent,
      });
    }
  };

  const isLoading =
    generateSuggestionMutation.isPending || createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {updateEntryId ? "Update Knowledge Bank Entry" : "Generate Knowledge Bank Entry"}
          </DialogTitle>
          <DialogDescription>
            {updateEntryId
              ? "Update an existing knowledge bank entry based on your reply."
              : "Generate a knowledge bank entry based on your reply to help answer similar questions in the future."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasGenerated ? (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                AI is analyzing your reply to suggest a knowledge bank entry...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">AI Suggestion Reason</label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">{suggestionReason}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Knowledge Bank Entry Content</label>
                <p className="text-sm text-muted-foreground mb-2">
                  Edit the suggested content below or write your own:
                </p>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[12rem]"
                  placeholder="Enter knowledge bank entry content..."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outlined" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {hasGenerated && (
            <Button onClick={handleSave} disabled={isLoading}>
              {(createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {updateEntryId ? "Update Knowledge Entry" : "Save Knowledge Entry"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
