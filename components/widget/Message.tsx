import type { JSONValue, Message } from "ai";
import cx from "classnames";
import { Paperclip } from "lucide-react";
import HumanizedTime from "@/components/humanizedTime";
import { Attachment } from "@/components/widget/Conversation";
import MessageElement from "@/components/widget/MessageElement";
import { useWidgetView } from "@/components/widget/useWidgetView";
import { PromptInfo } from "@/lib/ai/promptInfo";

const USER_ROLE = "user";

export type MessageWithReaction = Message & {
  reactionType: "thumbs-up" | "thumbs-down" | null;
  reactionFeedback: string | null;
  reactionCreatedAt: string | null;
};

type Props = {
  message: MessageWithReaction;
  allMessages: Message[];
  conversationSlug: string | null;
  token: string | null;
  data: JSONValue[] | null;
  attachments: Attachment[];
  color: "primary" | "gumroad-pink";
  hideReasoning?: boolean;
};

export default function Message({
  message,
  allMessages,
  conversationSlug,
  token,
  data,
  color,
  attachments,
  hideReasoning = false,
}: Props) {
  const { togglePromptInfo } = useWidgetView();
  const idFromAnnotation =
    message.annotations?.find(
      (annotation): annotation is { id: string | number } =>
        typeof annotation === "object" && annotation !== null && "id" in annotation,
    )?.id ?? null;
  const persistedId = idFromAnnotation ?? (!message.id.startsWith("client_") ? message.id : null);

  const promptInfo =
    message.annotations?.find(
      (annotation): annotation is { promptInfo: PromptInfo } =>
        typeof annotation === "object" && annotation !== null && "promptInfo" in annotation,
    )?.promptInfo ?? null;

  const reasoningStarted = data?.some(
    (item) => typeof item === "object" && item !== null && "event" in item && item.event === "reasoningStarted",
  );

  let reasoning =
    message.annotations?.find(
      (annotation): annotation is { reasoning: { message: string; reasoningTimeSeconds: number } } =>
        typeof annotation === "object" && annotation !== null && "reasoning" in annotation,
    )?.reasoning ?? null;

  if (!reasoning) {
    const reasoningFromData = data
      ?.flatMap((item) =>
        item && typeof item === "object" && "reasoning" in item && typeof item.reasoning === "string"
          ? [item.reasoning]
          : [],
      )
      .join("");

    if (reasoningFromData) {
      reasoning = { message: reasoningFromData, reasoningTimeSeconds: 0 };
    }
  }

  const userAnnotation = message.annotations?.find(
    (annotation): annotation is { user: { firstName: string } } =>
      typeof annotation === "object" && annotation !== null && "user" in annotation,
  );

  if (!conversationSlug || (!message.content && !reasoningStarted)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid="message" data-message-role={message.role}>
      <div
        className={cx("rounded-lg max-w-full", {
          "bg-primary text-primary-foreground": message.role === USER_ROLE,
          "border border-black bg-background text-foreground": message.role !== USER_ROLE,
        })}
      >
        {userAnnotation ? (
          <div className="p-4 pb-0 flex items-center text-gray-500 text-xs font-bold">
            {userAnnotation.user.firstName}
          </div>
        ) : null}
        <MessageElement
          messageId={persistedId?.toString()}
          conversationSlug={conversationSlug}
          message={message}
          reasoning={reasoning}
          hideReasoning={hideReasoning}
          token={token}
          color={color}
        />
        {message.experimental_attachments?.map((attachment) => (
          <div key={attachment.url} className="p-4 pt-0">
            <button
              type="button"
              className="w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => {
                if (attachment.url.startsWith("data:")) {
                  const link = document.createElement("a");
                  link.href = attachment.url;
                  link.target = "_blank";
                  link.rel = "noopener noreferrer";
                  link.download = attachment.name || "image";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  window.open(attachment.url, "_blank", "noopener,noreferrer");
                }
              }}
              aria-label={`View image: ${attachment.name}`}
            >
              <img
                className="w-full rounded-lg hover:opacity-90 transition-opacity"
                src={attachment.url}
                alt={attachment.name}
              />
            </button>
          </div>
        ))}
        {!message.experimental_attachments?.length && attachments.length > 0 && (
          <div className="p-4 pt-0 flex flex-col gap-2">
            {attachments.map((attachment) => (
              <a
                key={attachment.name}
                className="flex items-center gap-2"
                href={attachment.presignedUrl}
                target="_blank"
                download
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate underline">{attachment.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400" title={message.createdAt ? message.createdAt.toLocaleString() : ""}>
          {message.createdAt ? <HumanizedTime time={message.createdAt.toISOString()} /> : null}
        </span>
        {promptInfo && (
          <>
            <span className="text-xs text-gray-400">·</span>
            <button
              onClick={() => togglePromptInfo({ promptInfo, message, allMessages })}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
