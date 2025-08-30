"use client";

import { Edit2, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

interface GeneratedIssue {
  title: string;
  description?: string;
  reasoning: string;
}

interface GenerateIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (approvedSuggestions: { title: string; description?: string }[]) => void;
  isCreating: boolean;
}

export function GenerateIssuesDialog({ isOpen, onClose, onApprove, isCreating }: GenerateIssuesDialogProps) {
  const [editableSuggestions, setEditableSuggestions] = useState<GeneratedIssue[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const generateSuggestionsMutation = api.mailbox.issueGroups.generateSuggestions.useMutation({
    onSuccess: (data) => {
      setEditableSuggestions(data.issues);
    },
    onError: (error) => {
      toast.error("Error generating common issues", { description: error.message });
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen && editableSuggestions.length === 0 && !generateSuggestionsMutation.isPending) {
      generateSuggestionsMutation.mutate();
    }
    if (!isOpen) {
      // Reset state when dialog closes
      setEditableSuggestions([]);
      setEditingIndex(null);
    }
  }, [isOpen]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSave = (index: number, title: string, description: string) => {
    setEditableSuggestions((prev) =>
      prev.map((suggestion, i) => (i === index ? { ...suggestion, title, description } : suggestion)),
    );
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setEditableSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApprove = () => {
    const approvedSuggestions = editableSuggestions.map(({ title, description }) => ({
      title,
      description,
    }));
    onApprove(approvedSuggestions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Review generated common issues</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review and edit the AI-generated common issues before creating them. You can modify titles, descriptions, or
            remove issues you don't want.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {generateSuggestionsMutation.isPending && editableSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-4">
              <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <div>Analyzing conversations to generate common issues...</div>
            </div>
          ) : (
            <>
              {editableSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-2 sm:p-4 space-y-3">
                  {editingIndex === index ? (
                    <EditIssueForm
                      suggestion={suggestion}
                      onSave={(title, description) => handleSave(index, title, description)}
                      onCancel={() => setEditingIndex(null)}
                    />
                  ) : (
                    <ViewIssue
                      suggestion={suggestion}
                      onEdit={() => handleEdit(index)}
                      onDelete={() => handleDelete(index)}
                    />
                  )}
                </div>
              ))}

              {editableSuggestions.length === 0 && !generateSuggestionsMutation.isPending && (
                <div className="text-center py-8 text-muted-foreground">
                  No issues to create. All suggestions have been removed.
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outlined" onClick={onClose} disabled={isCreating || generateSuggestionsMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={editableSuggestions.length === 0 || isCreating || generateSuggestionsMutation.isPending}
          >
            {isCreating
              ? "Creating..."
              : generateSuggestionsMutation.isPending
                ? "Generating..."
                : `Create ${editableSuggestions.length} issue${editableSuggestions.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditIssueFormProps {
  suggestion: GeneratedIssue;
  onSave: (title: string, description: string) => void;
  onCancel: () => void;
}

function EditIssueForm({ suggestion, onSave, onCancel }: EditIssueFormProps) {
  const [title, setTitle] = useState(suggestion.title);
  const [description, setDescription] = useState(suggestion.description || "");

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim(), description.trim());
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Issue description (optional)"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outlined" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

interface ViewIssueProps {
  suggestion: GeneratedIssue;
  onEdit: () => void;
  onDelete: () => void;
}

function ViewIssue({ suggestion, onEdit, onDelete }: ViewIssueProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{suggestion.title}</h4>
          {suggestion.description && <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>}
        </div>
        <div className="flex gap-1 ml-2">
          <Button aria-label="Edit" variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button aria-label="Delete" variant="ghost" size="sm" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
        <strong>AI reasoning:</strong> {suggestion.reasoning}
      </div>
    </div>
  );
}
