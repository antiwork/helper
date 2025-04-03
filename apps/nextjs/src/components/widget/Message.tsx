import { UserIcon } from "@heroicons/react/16/solid";
import type { JSONValue, Message } from "ai";
import cx from "classnames";
import HumanizedTime from "@/components/humanizedTime";
import MessageElement from "@/components/widget/MessageElement";

const USER_ROLE = "user";

export type MessageWithReaction = Message & {
  reactionType: "thumbs-up" | "thumbs-down" | null;
  reactionFeedback: string | null;
  reactionCreatedAt: string | null;
};

type Props = {
  message: MessageWithReaction;
  conversationSlug: string | null;
  token: string | null;
  data: JSONValue[] | null;
  color: "black" | "gumroad-pink";
};

export default function Message({ message, conversationSlug, token, data, color }: Props) {
  const idFromAnnotation =
    message.annotations?.find(
      (annotation): annotation is { id: string | number } =>
        typeof annotation === "object" && annotation !== null && "id" in annotation,
    )?.id ?? null;
  const persistedId = idFromAnnotation ?? (!message.id.startsWith("client_") ? message.id : null);

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

  if (!conversationSlug) {
    return null;
  }

  return (
    <div
      className={cx("flex flex-col gap-2", {
        "ml-9 items-end": message.role === USER_ROLE,
        "mr-9 items-start": message.role !== USER_ROLE,
      })}
    >
      <div
        className={cx("rounded-lg max-w-full", {
          "bg-black text-white": message.role === USER_ROLE,
          "border border-black bg-white text-black": message.role !== USER_ROLE,
        })}
      >
        {userAnnotation ? (
          <div className="flex items-center text-muted-foreground text-xs">
            <UserIcon className="w-4 h-4 mr-2" />
            {userAnnotation.user.firstName}
          </div>
        ) : null}
        <MessageElement
          messageId={persistedId?.toString()}
          conversationSlug={conversationSlug}
          message={message}
          reasoning={reasoning}
          token={token}
          color={color}
        />
        {message.experimental_attachments?.map((attachment) => (
          <a
            key={attachment.url}
            href={attachment.url}
            className="block p-4 pt-0"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img className="w-full rounded-lg" src={attachment.url} alt={attachment.name} />
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400" title={message.createdAt ? message.createdAt.toLocaleString() : ""}>
          {message.createdAt ? <HumanizedTime time={message.createdAt.toISOString()} /> : null}
        </span>
      </div>
    </div>
  );
}
