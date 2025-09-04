"use client";

import { Edit2, PlusCircle, Sparkles, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import { GenerateIssuesDialog } from "./generateIssuesDialog";

type CommonIssueEditFormProps = {
  title: string;
  description: string;
  onSubmit: () => void;
  onCancel?: () => void;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  isLoading: boolean;
};

const CommonIssueEditForm = ({
  title,
  description,
  isLoading,
  onSubmit,
  onCancel,
  onTitleChange,
  onDescriptionChange,
}: CommonIssueEditFormProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="border rounded-lg p-4 space-y-4"
    >
      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="e.g., Login Issues"
          className="mt-2"
        />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange?.(e.target.value)}
          placeholder="Brief description of this issue group..."
          className="mt-2"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
};

const CommonIssuesSetting = () => {
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDescription, setNewIssueDescription] = useState("");
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingIssue, setEditingIssue] = useState<{ id: number; title: string; description: string } | null>(null);

  const utils = api.useUtils();

  const { data, isLoading } = api.mailbox.issueGroups.listAll.useQuery();
  const issueGroups = data?.groups ?? [];

  const filteredIssueGroups = issueGroups.filter(
    (group) =>
      group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const createMutation = api.mailbox.issueGroups.create.useMutation({
    onSuccess: () => {
      utils.mailbox.issueGroups.listAll.invalidate();
      setShowNewIssueForm(false);
      setNewIssueTitle("");
      setNewIssueDescription("");
      toast.success("Common issue created");
    },
    onError: (error) => {
      toast.error("Error creating common issue", { description: error.message });
    },
  });

  const deleteMutation = api.mailbox.issueGroups.delete.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Common issue deleted${data.unassignedConversations ? ` (${data.unassignedConversations} conversations unassigned)` : ""}`,
      );
      utils.mailbox.issueGroups.listAll.invalidate();
    },
    onError: (error) => {
      toast.error("Error deleting common issue", { description: error.message });
    },
  });

  const updateMutation = api.mailbox.issueGroups.update.useMutation({
    onSuccess: () => {
      utils.mailbox.issueGroups.listAll.invalidate();
      setEditingIssue(null);
      toast.success("Common issue updated");
    },
    onError: (error) => {
      toast.error("Error updating common issue", { description: error.message });
    },
  });

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const bulkCreateMutation = api.mailbox.issueGroups.bulkCreate.useMutation({
    onSuccess: (data) => {
      utils.mailbox.issueGroups.listAll.invalidate();
      toast.success(`Created ${data.createdIssues} common issues from your conversations`);
      setShowGenerateDialog(false);
    },
    onError: (error) => {
      toast.error("Error creating common issues", { description: error.message });
    },
  });

  const handleGenerateIssues = () => {
    setShowGenerateDialog(true);
  };

  const handleApproveSuggestions = async (approvedSuggestions: { title: string; description?: string }[]) => {
    await bulkCreateMutation.mutateAsync({ items: approvedSuggestions });
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    await createMutation.mutateAsync({
      title: newIssueTitle.trim(),
      description: newIssueDescription.trim() || undefined,
    });
  };

  const handleDeleteIssue = async (id: number) => {
    await deleteMutation.mutateAsync({
      id,
    });
  };

  const handleUpdateIssue = async () => {
    if (!editingIssue?.title.trim()) return;
    await updateMutation.mutateAsync({
      id: editingIssue.id,
      title: editingIssue.title.trim(),
      description: editingIssue.description.trim() || undefined,
    });
  };

  return (
    <SectionWrapper
      title="Common Issues"
      description="Create issue groups to organize and track recurring customer problems. These will help you quickly categorize and resolve similar conversations."
    >
      <Input
        type="text"
        placeholder="Search common issues..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />

      <div className="mb-4 divide-y divide-border">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4">
                <div className="grow space-y-2">
                  <div className="h-4 w-32 rounded bg-secondary animate-skeleton" />
                  <div className="h-3 w-48 rounded bg-secondary animate-skeleton" />
                </div>
                <div className="h-6 w-16 rounded bg-secondary animate-skeleton" />
              </div>
            ))}
          </>
        ) : filteredIssueGroups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground space-y-4">
            <div>{searchQuery ? "No common issues found matching your search." : "No common issues created yet."}</div>
            {!searchQuery && (
              <Button variant="outlined" onClick={handleGenerateIssues} className="mx-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate common issues
              </Button>
            )}
          </div>
        ) : (
          <>
            {filteredIssueGroups.map((group) => (
              <div key={group.id} className="py-4" data-testid="common-issue-item">
                {editingIssue?.id === group.id ? (
                  <CommonIssueEditForm
                    title={editingIssue.title}
                    description={editingIssue.description}
                    onTitleChange={(title) => setEditingIssue({ ...editingIssue, title })}
                    onDescriptionChange={(description) => setEditingIssue({ ...editingIssue, description })}
                    onSubmit={handleUpdateIssue}
                    onCancel={() => setEditingIssue(null)}
                    isLoading={updateMutation.isPending}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{group.title}</div>
                      {group.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{group.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {group.conversationCount} conversation{group.conversationCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() =>
                          setEditingIssue({
                            id: group.id,
                            title: group.title,
                            description: group.description || "",
                          })
                        }
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <ConfirmationDialog
                        message="Are you sure you want to delete this common issue? All conversations will be unassigned from this group."
                        onConfirm={() => handleDeleteIssue(group.id)}
                        confirmLabel="Yes, delete"
                      >
                        <Button variant="ghost" size="sm" iconOnly>
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </ConfirmationDialog>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {showNewIssueForm ? (
        <div className="mb-4">
          <CommonIssueEditForm
            title={newIssueTitle}
            description={newIssueDescription}
            onTitleChange={setNewIssueTitle}
            onDescriptionChange={setNewIssueDescription}
            onSubmit={handleCreateIssue}
            onCancel={() => {
              setShowNewIssueForm(false);
              setNewIssueTitle("");
              setNewIssueDescription("");
            }}
            isLoading={createMutation.isPending}
          />
        </div>
      ) : (
        <Button
          variant="subtle"
          onClick={(e) => {
            e.preventDefault();
            setNewIssueTitle("");
            setNewIssueDescription("");
            setShowNewIssueForm(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Common Issue
        </Button>
      )}

      <GenerateIssuesDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onApprove={handleApproveSuggestions}
        isCreating={bulkCreateMutation.isPending}
      />
    </SectionWrapper>
  );
};

export default CommonIssuesSetting;
