import { formatDuration } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { MessageWithReaction } from "@/components/widget/Message";

type Reasoning = {
  message: string;
  reasoningTimeSeconds?: number;
};

export default function MessageElement({
  messageId,
  message,
  reasoning,
  token,
  conversationSlug,
  color,
}: {
  messageId: string | undefined;
  message: MessageWithReaction;
  reasoning: Reasoning | null;
  token: string | null;
  conversationSlug: string | null;
  color: "black" | "gumroad-pink";
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningTimeCounter, setReasoningTimeCounter] = useState(0);

  const hasContent = message.content.length > 0;

  useEffect(() => {
    if (hasContent) return;
    const interval = setInterval(() => setReasoningTimeCounter((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [hasContent]);

  const formattedReasoningTime = reasoning?.reasoningTimeSeconds
    ? formatDuration({ seconds: reasoning.reasoningTimeSeconds })
    : hasContent
      ? null
      : formatDuration({ seconds: reasoningTimeCounter });

  const handleReasoningClick = async () => {
    const newShowReasoning = !showReasoning;
    setShowReasoning(newShowReasoning);
    if (!messageId) return;
    try {
      await fetch(`/api/chat/conversation/${conversationSlug}/message/${messageId}/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "reasoning_toggled",
          changes: {
            isVisible: newShowReasoning,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to track reasoning toggle:", error);
    }
  };

  const loadingClasses = `absolute top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-${color}`;

  return (
    <div className="relative p-4">
      {(reasoning || !hasContent) && (
        <button
          onClick={handleReasoningClick}
          className="flex items-center gap-1 text-xs text-gray-800 hover:text-gray-700 transition-colors mb-2"
        >
          {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {formattedReasoningTime ? (
            <span>
              {hasContent ? "Thought" : "Thinking"} for {formattedReasoningTime}
            </span>
          ) : (
            <span>Thoughts</span>
          )}
        </button>
      )}
      {showReasoning && reasoning && (
        <ReactMarkdown className="border-l border-gray-500 mt-2 text-sm text-gray-800 px-2 mb-4 prose-p:mb-2">
          {reasoning.message}
        </ReactMarkdown>
      )}
      {hasContent ? (
        <ReactMarkdown
          className={`prose prose-sm max-w-none text-base ${message.role === "user" ? "text-white" : "text-black"}`}
          components={{
            a: ({ children, ...props }: any) => (
              <a target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      ) : (
        <div className="relative h-4 w-20 overflow-hidden rounded-lg">
          <div className={`${loadingClasses} ball-1`}></div>
          <div className={`${loadingClasses} ball-2`}></div>
          <div className={`${loadingClasses} ball-3`}></div>
          <div className={`${loadingClasses} ball-4`}></div>
        </div>
      )}
    </div>
  );
}
