"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RouterOutputs } from "@/trpc";

type SavedReply = RouterOutputs["mailbox"]["savedReplies"]["list"][number];

interface SavedReplyPreviewProps {
  savedReply: SavedReply;
  mailboxSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedReplyPreview({ savedReply, mailboxSlug, open, onOpenChange }: SavedReplyPreviewProps) {
  const [copyText, setCopyText] = useState("Copy");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyText("Copied!");
      timeoutRef.current = setTimeout(() => setCopyText("Copy"), 2000);
    } catch (error) {
      setCopyText("Failed");
      timeoutRef.current = setTimeout(() => setCopyText("Copy"), 2000);
    }
  };

  if (!savedReply) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{savedReply.name}</span>
            <Button variant="outlined" size="sm" onClick={() => handleCopy(savedReply.content)}>
              <Copy className="h-4 w-4 mr-2" />
              {copyText}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ScrollArea className="h-64 w-full border rounded-md p-4">
            <div className="whitespace-pre-wrap text-sm">{savedReply.content}</div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Last updated {savedReply.updatedAt.toLocaleDateString()} • Used {savedReply.usageCount} times
            </div>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
