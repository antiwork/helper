import { Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
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

  const utils = api.useUtils();

  const generateSuggestionMutation = api.mailbox.faqs.suggestFromHumanReply.useMutation({
    onSuccess: (data) => {
      if (data.action === "create_entry") {
        setSuggestedContent(data.content || "");
        setEditedContent(data.content || "");
        setSuggestionReason(data.reason);
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

  const resetState = () => {
    setSuggestedContent("");
    setEditedContent("");
    setSuggestionReason("");
    setHasGenerated(false);
  };

  const handleGenerate = () => {
    generateSuggestionMutation.mutate({ mailboxSlug, messageId });
  };

  const handleSave = () => {
    if (!editedContent.trim()) {
      toast({
        title: "Content required",
        description: "Please enter content for the knowledge bank entry",
        variant: "destructive",
      });
      return;
    }

    createKnowledgeMutation.mutate({
      mailboxSlug,
      content: editedContent,
    });
  };

  const isLoading = generateSuggestionMutation.isPending || createKnowledgeMutation.isPending;

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
            Generate Knowledge Bank Entry
          </DialogTitle>
          <DialogDescription>
            Generate a knowledge bank entry based on your reply to help answer similar questions in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasGenerated ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                AI will analyze your reply and suggest a knowledge bank entry if the information would be valuable for
                future inquiries.
              </p>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {generateSuggestionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Suggestion
              </Button>
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
              {createKnowledgeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Knowledge Entry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
