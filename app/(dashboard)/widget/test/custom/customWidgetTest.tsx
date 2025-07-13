"use client";

import { useState } from "react";
import { useChat, useCreateConversation } from "@helperai/react";
import { cn } from "@/lib/utils";

export const CustomWidgetTest = () => {
  const { createConversation } = useCreateConversation();
  const [conversationSlug, setConversationSlug] = useState<string | null>(null);

  return (
    <div>
      {conversationSlug && <ChatWidget conversationSlug={conversationSlug} />}
      <button
        onClick={() => createConversation().then(({ conversationSlug }) => setConversationSlug(conversationSlug))}
      >
        Create Conversation
      </button>
    </div>
  );
};

const ChatWidget = ({ conversationSlug }: { conversationSlug: string }) => {
  const { messages, send } = useChat(conversationSlug, {
    tools: {
      getProductStatus: {
        description: "Get the status of a Gumroad product",
        parameters: {
          productId: { type: "string", description: "The ID of the Gumroad product" },
        },
        execute: ({ productId }) => {
          return `The status of ${productId} is ${Math.random() > 0.5 ? "active" : "inactive"}`;
        },
      },
    },
  });
  const [input, setInput] = useState("");

  return (
    <div>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div
            className={cn(
              "rounded p-2",
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
            key={message.id}
          >
            {message.content}
          </div>
        ))}
      </div>
      <input type="text" className="bg-muted" value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => send(input)}>Send</button>
    </div>
  );
};
