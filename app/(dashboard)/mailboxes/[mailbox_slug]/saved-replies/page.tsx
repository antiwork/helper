"use client";

import { Copy, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/components/useDocumentTitle";
import { stripHtmlTags } from "@/components/utils/html";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SavedReplyForm } from "./savedReplyForm";

type SavedReply = RouterOutputs["mailbox"]["savedReplies"]["list"][number];

export default function SavedRepliesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSavedReply, setEditingSavedReply] = useState<SavedReply | null>(null);

  useDocumentTitle("Saved replies");

  // Debounce search term to avoid losing focus on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: savedReplies,
    refetch,
    isLoading,
  } = api.mailbox.savedReplies.list.useQuery({
    search: debouncedSearchTerm || undefined,
  });

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    refetch();
    toast.success("Saved reply created successfully");
  };

  const handleEditSuccess = () => {
    setEditingSavedReply(null);
    refetch();
    toast.success("Saved reply updated successfully");
  };

  const handleCopySavedReply = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Saved reply copied to clipboard");
    } catch (error) {
      captureExceptionAndLog(error);
      toast.error("Failed to copy saved reply");
    }
  };

  const filteredSavedReplies = savedReplies || [];
  const hasRepliesOrSearch = filteredSavedReplies.length > 0 || searchTerm.length > 0;

  const searchInput = (
    <Input
      placeholder="Search saved replies..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full h-10 rounded-full text-sm"
      iconsPrefix={<Search className="ml-1 h-4 w-4 text-foreground" />}
    />
  );

  return (
    <FileUploadProvider>
      <div className="flex-1 flex flex-col">
        <PageHeader title="Saved replies">
          {hasRepliesOrSearch && (
            <div className="hidden sm:block">
              <div className="w-64">{searchInput}</div>
            </div>
          )}
        </PageHeader>

        {hasRepliesOrSearch && (
          <div className="px-3 md:px-6 py-2 md:py-4 shrink-0 border-b border-border sm:hidden">{searchInput}</div>
        )}

        <div className="flex-1 space-y-6 p-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-3 w-4/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSavedReplies.map((savedReply) => (
                <Card
                  key={savedReply.slug}
                  className="hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                  onClick={() => setEditingSavedReply(savedReply)}
                  data-testid="saved-reply-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg line-clamp-1">{savedReply.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySavedReply(savedReply.content);
                        }}
                        data-testid="copy-button"
                      >
                        <Copy className="h-4 w-4" data-testid="copy-icon" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                      {stripHtmlTags(savedReply.content)}
                    </div>
                    <div className="flex items-center justify-start text-xs text-muted-foreground mt-auto">
                      <span>Used {savedReply.usageCount} times</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filteredSavedReplies.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? "No saved replies found matching your search" : "No saved replies yet"}
              </div>
              {!searchTerm && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create one
                </Button>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={() => setShowCreateDialog(true)}
          variant="default"
          iconOnly
          className="fixed z-50 bottom-6 right-6 rounded-full text-primary-foreground dark:bg-bright dark:text-bright-foreground bg-bright hover:bg-bright/90 hover:text-background"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New saved reply</DialogTitle>
              <DialogDescription>
                Create a reusable text template that can be quickly inserted into conversations.
              </DialogDescription>
            </DialogHeader>
            <SavedReplyForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>

        {editingSavedReply && (
          <Dialog open={!!editingSavedReply} onOpenChange={() => setEditingSavedReply(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit saved reply</DialogTitle>
                <DialogDescription>Update your saved reply template.</DialogDescription>
              </DialogHeader>
              <SavedReplyForm
                savedReply={editingSavedReply}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditingSavedReply(null)}
                onDelete={() => {
                  setEditingSavedReply(null);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </FileUploadProvider>
  );
}
