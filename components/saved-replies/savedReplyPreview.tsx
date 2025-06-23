"use client";

import { Calendar, Copy } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SavedReply {
  id: string;
  slug: string;
  name: string;
  content: string;
  description?: string;
  shortcut?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByDisplayName?: string;
}

interface SavedReplyPreviewProps {
  macro: SavedReply;
  mailboxSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedReplyPreview({ macro, mailboxSlug, open, onOpenChange }: SavedReplyPreviewProps) {
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied to clipboard", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  if (!macro) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{macro.name}</span>
            <Button variant="outlined" size="sm" onClick={() => handleCopy(macro.content)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </DialogTitle>
          {macro.description && <DialogDescription>{macro.description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {macro.shortcut && (
                <Badge variant="gray" className="font-mono">
                  {macro.shortcut}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(macro.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Content</CardTitle>
              <CardDescription>Saved reply template content</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full border rounded-md p-4">
                <div className="whitespace-pre-wrap text-sm">{macro.content}</div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Created by {macro.createdByDisplayName || "Admin"} • Last updated{" "}
              {new Date(macro.updatedAt).toLocaleDateString()}
            </div>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
