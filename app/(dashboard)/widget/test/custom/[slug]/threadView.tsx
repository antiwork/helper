"use client";

import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConversationDetails } from "@helperai/client";
import { MessageContent, useCreateMessage, useRealtimeEvents } from "@helperai/react";
import { Button } from "@/components/ui/button";
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

export const ThreadView = ({ conversation }: { conversation: ConversationDetails }) => {
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    createMessage({
      conversationSlug: conversation.slug,
      content: input.trim(),
      attachments: selectedFiles,
      tools: {
        getCurrentTime: {
          description: "Get the current time",
          parameters: {},
          url: "/widget/test/custom/tool",
        },
      },
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
          <Button type="submit" disabled={isPending || !input.trim()}>
            {isPending ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
    </>
  );
};
