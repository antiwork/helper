"use client";

import { Copy, Plus, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { PageHeader } from "@/components/pageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SavedReplyForm } from "./savedReplyForm";

type SavedReply = RouterOutputs["mailbox"]["savedReplies"]["list"][number];

export default function SavedRepliesPage() {
  const params = useParams();
  const mailboxSlug = params.mailbox_slug as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSavedReply, setEditingSavedReply] = useState<SavedReply | null>(null);

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
    mailboxSlug,
    search: debouncedSearchTerm || undefined,
  });

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    refetch();
    toast({ title: "Saved reply created successfully", variant: "success" });
  };

  const handleEditSuccess = () => {
    setEditingSavedReply(null);
    refetch();
    toast({ title: "Saved reply updated successfully", variant: "success" });
  };

  const handleCopySavedReply = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Saved reply copied to clipboard", variant: "success" });
    } catch (error) {
      captureExceptionAndLog(error);
      toast({ title: "Failed to copy saved reply", variant: "destructive" });
    }
  };

  const filteredSavedReplies = savedReplies || [];
  const hasRepliesOrSearch = filteredSavedReplies.length > 0 || searchTerm.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Saved replies">
        {hasRepliesOrSearch && (
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search saved replies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New saved reply
            </Button>
          </div>
        )}
      </PageHeader>

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
                  <div className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">{savedReply.content}</div>
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New saved reply</DialogTitle>
            <DialogDescription>
              Create a reusable text template that can be quickly inserted into conversations.
            </DialogDescription>
          </DialogHeader>
          <SavedReplyForm
            mailboxSlug={mailboxSlug}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
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
              mailboxSlug={mailboxSlug}
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
  );
}
