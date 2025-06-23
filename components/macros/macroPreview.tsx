"use client";

import { Calendar, Copy, Eye, EyeOff, Tag, TrendingUp, User, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

interface Macro {
  id: string;
  slug: string;
  name: string;
  content: string;
  description?: string;
  category?: string;
  isGlobal: boolean;
  shortcut?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByDisplayName?: string;
}

interface MacroPreviewProps {
  macro: Macro;
  mailboxSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MacroPreview({ macro, mailboxSlug, open, onOpenChange }: MacroPreviewProps) {
  const [showProcessed, setShowProcessed] = useState(true);
  const [processedContent, setProcessedContent] = useState("");

  const { mutateAsync: processContent } = api.mailbox.macros.processContent.useMutation();

  useEffect(() => {
    if (open && macro) {
      processContent({ mailboxSlug, content: macro.content })
        .then((result) => {
          setProcessedContent(result.processedContent);
        })
        .catch((error) => {
          console.error('Failed to process macro content:', error);
          setProcessedContent(macro.content);
          toast({
            title: "Variable processing unavailable",
            description: "Showing raw content instead",
            variant: "destructive"
          });
        });
    }
  }, [open, macro, mailboxSlug, processContent]);

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
            <div className="flex items-center space-x-2">
              <Button variant="outlined" size="sm" onClick={() => setShowProcessed(!showProcessed)}>
                {showProcessed ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showProcessed ? "Show Raw" : "Show Processed"}
              </Button>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => handleCopy(showProcessed ? processedContent : macro.content)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </DialogTitle>
          {macro.description && <DialogDescription>{macro.description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {macro.category && (
                <Badge variant="gray" className="flex items-center space-x-1">
                  <Tag className="h-3 w-3" />
                  <span>{macro.category}</span>
                </Badge>
              )}
              {macro.isGlobal && (
                <Badge variant="gray" className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>Global</span>
                </Badge>
              )}
              {macro.shortcut && (
                <Badge variant="gray" className="font-mono">
                  {macro.shortcut}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>{macro.usageCount} uses</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(macro.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                {showProcessed ? (
                  <>
                    <Wand2 className="h-5 w-5" />
                    <span>Processed Content</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-5 w-5" />
                    <span>Raw Content</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {showProcessed
                  ? "Content with variables replaced with actual values"
                  : "Raw macro content with variable placeholders"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full border rounded-md p-4">
                <div className="whitespace-pre-wrap text-sm">{showProcessed ? processedContent : macro.content}</div>
              </ScrollArea>
            </CardContent>
          </Card>

          {showProcessed && processedContent !== macro.content && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Variables Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {macro.content.match(/\{\{[^}]+\}\}/g)?.map((variable: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs">{variable}</code>
                      <span className="text-xs">→</span>
                      <span className="text-xs">
                        {processedContent.includes(variable) ? "Not replaced (no data)" : "Replaced with actual value"}
                      </span>
                    </div>
                  )) || <div className="text-xs italic">No variables found in this macro</div>}
                </div>
              </CardContent>
            </Card>
          )}

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
