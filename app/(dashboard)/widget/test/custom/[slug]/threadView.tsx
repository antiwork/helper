"use client";

import { Link2, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConversationDetails, HelperServerTool } from "@helperai/client";
import { MessageContent, useCreateMessage, useRealtimeEvents } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const AttachmentDisplay = ({
  attachments,
}: {
  attachments: { name: string | null; contentType: string | null; url: string }[];
}) => {
  if (!attachments.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {attachments.map((attachment, index) => (
        <a
          key={`${attachment.url}-${index}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.name || "attachment"}
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="flex-1 min-w-0 truncate">{attachment.name || "Untitled attachment"}</span>
        </a>
      ))}
    </div>
  );
};
const ToolForm = ({
  onSubmit,
  open,
  onOpenChange,
}: {
  onSubmit?: (data: { tool_name: string; tool: HelperServerTool }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && description && url) {
      onSubmit?.({ tool_name: name, tool: { description, url, parameters: {} } });
      setName("");
      setDescription("");
      setUrl("");
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>Add Tool</DialogHeader>
        <form className="flex flex-col gap-3 mt-2" onSubmit={handleSubmit}>
          <Input placeholder="Tool Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <Button type="submit">Add Tool</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ThreadView = ({ conversation }: { conversation: ConversationDetails }) => {
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isToolFormOpen, setIsToolFormOpen] = useState(false);
  const [tools, setTools] = useState<Record<string, HelperServerTool>>({
    getCurrentTime: {
      description: "Get the current time",
      parameters: {},
      url: "/widget/test/custom/tool",
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { mutate: createMessage, isPending } = useCreateMessage({
    onSuccess: () => {
      setInput("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  useRealtimeEvents(conversation.slug);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [conversation.messages?.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeTool = (tool_name: string) => {
    setTools((prev) => {
      const newTools = { ...prev };
      delete newTools[tool_name];
      return newTools;
    });
  };

  const addTool = (tool: { tool_name: string; tool: HelperServerTool }) => {
    setTools((prev) => ({ ...prev, [tool.tool_name]: tool.tool }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    createMessage({
      conversationSlug: conversation.slug,
      content: input.trim(),
      attachments: selectedFiles,
      tools: tools,
      customerSpecificTools: true,
    });
  };

  return (
    <>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col -mt-4">
          {conversation.messages?.map((message) => (
            <div key={message.id} className="p-4 border-b">
              <div className="text-sm text-muted-foreground">
                {message.role === "user" ? "You" : (message.staffName ?? "Helper")}
              </div>
              <MessageContent className="prose" message={message} />
              <AttachmentDisplay attachments={[...message.publicAttachments, ...message.privateAttachments]} />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        {Object.keys(tools).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {Object.entries(tools).map(([key, tool]) => (
              <div key={key} className="flex items-center gap-2 bg-secondary rounded px-2 py-1 text-sm">
                <Link2 className="h-3 w-3" />
                <span className="truncate max-w-32">{tool.description}</span>
                <button
                  onClick={() => removeTool(key)}
                  className="text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 bg-secondary rounded px-2 py-1 text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <ToolForm open={isToolFormOpen} onOpenChange={setIsToolFormOpen} onSubmit={addTool} />
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
          />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
          <Button type="button" variant="outlined" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="outlined" size="sm" onClick={() => setIsToolFormOpen(true)}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={isPending || !input.trim()}>
            {isPending ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
    </>
  );
};
