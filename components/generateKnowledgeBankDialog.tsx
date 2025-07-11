import { Lightbulb, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type GenerateKnowledgeBankDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: number;
};

export const GenerateKnowledgeBankDialog = ({ open, onOpenChange, messageId }: GenerateKnowledgeBankDialogProps) => {
  const [editedContent, setEditedContent] = useState<string>("");
  const [suggestionReason, setSuggestionReason] = useState<string>("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [updateEntryId, setUpdateEntryId] = useState<number | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");

  const utils = api.useUtils();

  // Get the original entry content if we're updating
  const { data: existingEntries } = api.mailbox.faqs.list.useQuery(undefined, {
    enabled: open && updateEntryId !== null,
  });

  const generateSuggestionMutation = api.mailbox.faqs.suggestFromHumanReply.useMutation({
    onSuccess: (data) => {
      if (data.action === "create_entry" || data.action === "update_entry") {
        setEditedContent(data.content || "");
        setSuggestionReason(data.reason);
        setUpdateEntryId(data.entryId || null);
        setHasGenerated(true);

        // Find the original content if updating
        if (data.action === "update_entry" && data.entryId && existingEntries) {
          const existingEntry = existingEntries.find((entry) => entry.id === data.entryId);
          setOriginalContent(existingEntry?.content || "");
        }
      } else {
        toast.info("No knowledge entry needed", {
          description: data.reason,
        });
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast.error("Error generating suggestion", {
        description: error.message,
      });
    },
  });

  const createKnowledgeMutation = api.mailbox.faqs.create.useMutation({
    onSuccess: () => {
      toast.success("Knowledge bank entry created!");
      utils.mailbox.faqs.list.invalidate();
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      toast.error("Error creating knowledge entry", {
        description: error.message,
      });
    },
  });

  const updateKnowledgeMutation = api.mailbox.faqs.update.useMutation({
    onSuccess: () => {
      toast.success("Knowledge bank entry updated!");
      utils.mailbox.faqs.list.invalidate();
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      toast.error("Error updating knowledge entry", {
        description: error.message,
      });
    },
  });

  const resetState = () => {
    setEditedContent("");
    setSuggestionReason("");
    setHasGenerated(false);
    setUpdateEntryId(null);
    setOriginalContent("");
  };

  // Auto-run AI suggestion when dialog opens
  useEffect(() => {
    if (open && messageId && !hasGenerated && !generateSuggestionMutation.isPending) {
      generateSuggestionMutation.mutate({
        messageId,
      });
    }
  }, [open, messageId, hasGenerated]);

  // Update original content when existing entries are loaded
  useEffect(() => {
    if (updateEntryId && existingEntries) {
      const existingEntry = existingEntries.find((entry) => entry.id === updateEntryId);
      if (existingEntry) {
        setOriginalContent(existingEntry.content);
      }
    }
  }, [updateEntryId, existingEntries]);

  const handleSave = () => {
    if (!editedContent.trim()) {
      toast.error("Content required", {
        description: "Please enter content for the knowledge bank entry",
      });
      return;
    }

    if (updateEntryId) {
      updateKnowledgeMutation.mutate({
        id: updateEntryId,
        content: editedContent,
      });
    } else {
      createKnowledgeMutation.mutate({
        content: editedContent,
      });
    }
  };

  const isLoading =
    generateSuggestionMutation.isPending || createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending;

  if (!open) return null;

  return (
    <Dialog
      open
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
                <Label>AI Suggestion Reason</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">{suggestionReason}</p>
              </div>

              {updateEntryId && originalContent && (
                <div>
                  <Label>Original Content</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <ReactMarkdown className="prose prose-sm">{originalContent}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div>
                <Label>{updateEntryId ? "Suggested Change" : "Knowledge Bank Entry Content"}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Edit the suggested content below or write your own:
                </p>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className={cn("min-h-[12rem]", updateEntryId && "border-bright")}
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
