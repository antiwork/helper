import { formatDuration } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import MessageMarkdown from "@/components/messageMarkdown";
import type { MessageWithReaction } from "@/components/widget/Message";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

type Reasoning = {
  message: string;
  reasoningTimeSeconds?: number;
};

export default function MessageElement({
  messageId,
  message,
  reasoning,
  hideReasoning,
  token,
  conversationSlug,
  color,
}: {
  messageId: string | undefined;
  message: MessageWithReaction;
  reasoning: Reasoning | null;
  hideReasoning: boolean;
  token: string | null;
  conversationSlug: string | null;
  // bg-primary or bg-gumroad-pink - Keep this for Tailwind to identify the color
  color: "primary" | "gumroad-pink";
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
      captureExceptionAndLog(error);
    }
  };

  const loadingClasses = `absolute top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-${color}`;
  const sources = message.parts?.filter((part) => part.type === "source");
  const uniqueSources = sources?.filter(
    (part, index, self) => index === self.findIndex((p) => p.source.id === part.source.id),
  );

  return (
    <div className="relative p-4">
      {!hideReasoning && (reasoning || !hasContent) && (
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
        <MessageMarkdown className="border-l border-gray-500 mt-2 text-sm text-gray-800 px-2 mb-4 prose-p:mb-2">
          {reasoning.message}
        </MessageMarkdown>
      )}
      {hasContent ? (
        <MessageMarkdown
          className={`prose prose-sm max-w-none text-sm ${message.role === "user" ? "text-primary-foreground **:text-primary-foreground" : "text-foreground **:text-foreground"}`}
        >
          {message.parts?.find(
            (part) => part.type === "tool-invocation" && part.toolInvocation.toolName === "request_human_support",
          )
            ? "_Escalated to a human! You will be contacted soon here and by email._"
            : message.content}
        </MessageMarkdown>
      ) : (
        <div className="relative h-4 w-20 overflow-hidden rounded-lg">
          <div className={`${loadingClasses} ball-1`}></div>
          <div className={`${loadingClasses} ball-2`}></div>
          <div className={`${loadingClasses} ball-3`}></div>
          <div className={`${loadingClasses} ball-4`}></div>
        </div>
      )}

      {uniqueSources && uniqueSources.length > 0 && (
        <div className="mt-2 text-sm text-gray-800 flex flex-col gap-2">
          <span className="font-semibold">Sources:</span>
          <ol className="list-inside list-decimal pl-5 space-y-1">
            {uniqueSources.map((part) => (
              <li key={`source-${part.source.id}`} value={Number(part.source.id)}>
                <a href={part.source.url} target="_blank">
                  <span className="text-gray-600 underline block truncate">
                    {part.source.title ?? new URL(part.source.url).hostname}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
