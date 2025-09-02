"use client";

import { useChat } from "@ai-sdk/react";
import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConversationDetails } from "@helperai/client";
import { MessageContent, useHelperClient } from "@helperai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export const ChatView = ({ conversation }: { conversation: ConversationDetails }) => {
  const { client } = useHelperClient();
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, setMessages, input, handleInputChange, handleSubmit } = useChat({
    ...client.chat.handler({
      conversation,
      tools: {
        getProductStatus: {
          description: "Get the status of a Gumroad product",
          parameters: {
            productId: { type: "string", description: "The ID of the Gumroad product" },
          },
          execute: ({ productId }: { productId: string }) => {
            return `The status of ${productId} is ${Math.random() > 0.5 ? "active" : "inactive"}`;
          },
        },
        listCoupons: {
          description: "Get list of all available discount coupons and their details",
          parameters: {},
          url: `/widget/test/custom/tool/list-coupons`,
        },
      },
    }),
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitWithAttachments = (e: { preventDefault: () => void }) => {
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach((file) => dataTransfer.items.add(file));

    handleSubmit(e, { experimental_attachments: dataTransfer.files });
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const unlisten = client.conversations.listen(conversation.slug, {
      onReply: ({ aiMessage }) => {
        setMessages((prev) => [...prev, aiMessage]);
      },
      onTyping: (isTyping) => {
        setIsTyping(isTyping);
      },
    });
    return () => unlisten();
  }, [conversation.slug, client]);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {client.chat.messages(messages).map((message) => (
            <div
              className={cn(
                "rounded-lg p-3 max-w-[80%]",
                message.role === "user" ? "border border-bright ml-auto" : "bg-secondary text-secondary-foreground",
              )}
              key={message.id}
            >
              <MessageContent className="prose" message={message} />
              <AttachmentDisplay attachments={[...message.publicAttachments, ...message.privateAttachments]} />
            </div>
          ))}
          {isTyping && <div className="animate-pulse">An agent is typing...</div>}
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

        <form onSubmit={submitWithAttachments} className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                submitWithAttachments(e);
              }
            }}
          />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
          <Button type="button" variant="outlined" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="submit">Send</Button>
        </form>
      </div>
    </>
  );
};
