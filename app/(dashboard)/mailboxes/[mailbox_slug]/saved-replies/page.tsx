"use client";

import { Copy, Edit3, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { PageHeader } from "@/components/pageHeader";
import { SavedReplyForm } from "@/components/saved-replies/savedReplyForm";
import { SavedReplyPreview } from "@/components/saved-replies/savedReplyPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

export default function SavedRepliesPage() {
  const params = useParams();
  const mailboxSlug = params.mailbox_slug as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSavedReply, setEditingSavedReply] = useState<any>(null);
  const [previewSavedReply, setPreviewSavedReply] = useState<any>(null);

  const { data: savedReplies, refetch } = api.mailbox.savedReplies.list.useQuery({
    mailboxSlug,
    search: searchTerm || undefined,
  });

  const { mutate: deleteSavedReply } = api.mailbox.savedReplies.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Saved reply deleted successfully", variant: "success" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to delete saved reply", description: error.message, variant: "destructive" });
    },
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
      toast({ title: "Failed to copy saved reply", variant: "destructive" });
    }
  };

  const filteredSavedReplies = savedReplies || [];

  return (
    <div className="flex-1 space-y-6 p-6 pt-0">
      <PageHeader title="Saved Replies" />

      <Tabs defaultValue="saved-replies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved-replies">All Saved Replies ({savedReplies?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="saved-replies" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search saved replies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Saved Reply
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Saved Reply</DialogTitle>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSavedReplies.map((savedReply) => (
              <Card key={savedReply.slug} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{savedReply.name}</CardTitle>
                      {savedReply.description && (
                        <CardDescription className="line-clamp-2">{savedReply.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewSavedReply(savedReply)}>
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSavedReply(savedReply)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopySavedReply(savedReply.content)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Saved Reply</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{savedReply.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSavedReply({ mailboxSlug, slug: savedReply.slug })}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {savedReply.shortcut && (
                        <Badge variant="gray" className="text-xs font-mono">
                          {savedReply.shortcut}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-3">{savedReply.content}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSavedReplies.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? "No saved replies found matching your search" : "No saved replies created yet"}
              </div>
              {!searchTerm && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Saved Reply
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingSavedReply && (
        <Dialog open={!!editingSavedReply} onOpenChange={() => setEditingSavedReply(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Saved Reply</DialogTitle>
              <DialogDescription>Update your saved reply template.</DialogDescription>
            </DialogHeader>
            <SavedReplyForm
              macro={editingSavedReply}
              mailboxSlug={mailboxSlug}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingSavedReply(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {previewSavedReply && (
        <SavedReplyPreview
          macro={previewSavedReply}
          mailboxSlug={mailboxSlug}
          open={!!previewSavedReply}
          onOpenChange={() => setPreviewSavedReply(null)}
        />
      )}
    </div>
  );
}
