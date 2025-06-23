"use client";

import { Copy, Edit3, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { MacroForm } from "@/components/macros/macroForm";
import { MacroPreview } from "@/components/macros/macroPreview";
import { PageHeader } from "@/components/pageHeader";
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

export default function MacrosPage() {
  const params = useParams();
  const mailboxSlug = params.mailbox_slug as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMacro, setEditingMacro] = useState<any>(null);
  const [previewMacro, setPreviewMacro] = useState<any>(null);

  const { data: macros, refetch } = api.mailbox.macros.list.useQuery({
    mailboxSlug,
    search: searchTerm || undefined,
  });
  const { data: analytics } = api.mailbox.macros.analytics.useQuery({ mailboxSlug });

  const { mutate: deleteMacro } = api.mailbox.macros.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Macro deleted successfully", variant: "success" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to delete macro", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    refetch();
    toast({ title: "Macro created successfully", variant: "success" });
  };

  const handleEditSuccess = () => {
    setEditingMacro(null);
    refetch();
    toast({ title: "Macro updated successfully", variant: "success" });
  };

  const handleCopyMacro = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Macro copied to clipboard", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to copy macro", variant: "destructive" });
    }
  };

  const filteredMacros = macros || [];

  return (
    <div className="flex-1 space-y-6 p-6 pt-0">
      <PageHeader title="Macros" />

      <Tabs defaultValue="macros" className="space-y-6">
        <TabsList>
          <TabsTrigger value="macros">All Macros ({macros?.length || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="macros" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search macros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Macro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Macro</DialogTitle>
                  <DialogDescription>
                    Create a reusable text template that can be quickly inserted into conversations.
                  </DialogDescription>
                </DialogHeader>
                <MacroForm
                  mailboxSlug={mailboxSlug}
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMacros.map((macro) => (
              <Card key={macro.slug} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{macro.name}</CardTitle>
                      {macro.description && (
                        <CardDescription className="line-clamp-2">{macro.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewMacro(macro)}>
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingMacro(macro)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyMacro(macro.content)}>
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
                            <AlertDialogTitle>Delete Macro</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{macro.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMacro({ mailboxSlug, slug: macro.slug })}>
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
                      {macro.isGlobal && (
                        <Badge variant="gray" className="text-xs">
                          Global
                        </Badge>
                      )}
                      {macro.shortcut && (
                        <Badge variant="gray" className="text-xs font-mono">
                          {macro.shortcut}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {macro.usageCount}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-3">{macro.content}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMacros.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? "No macros found matching your search" : "No macros created yet"}
              </div>
              {!searchTerm && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Macro
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Macros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalMacros || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalUsage || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recently Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.recentlyCreated?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Most Used Macros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.mostUsed?.slice(0, 10).map((macro) => (
                    <div key={macro.slug} className="flex items-center justify-between">
                      <div className="font-medium truncate">{macro.name}</div>
                      <Badge variant="gray">{macro.usageCount} uses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {editingMacro && (
        <Dialog open={!!editingMacro} onOpenChange={() => setEditingMacro(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Macro</DialogTitle>
              <DialogDescription>Update your macro template.</DialogDescription>
            </DialogHeader>
            <MacroForm
              macro={editingMacro}
              mailboxSlug={mailboxSlug}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingMacro(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {previewMacro && (
        <MacroPreview
          macro={previewMacro}
          mailboxSlug={mailboxSlug}
          open={!!previewMacro}
          onOpenChange={() => setPreviewMacro(null)}
        />
      )}
    </div>
  );
}
