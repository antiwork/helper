import type { JSONValue, Message } from "ai";
import cx from "classnames";
import { useEffect } from "react";
import HumanizedTime from "@/components/humanizedTime";
import MessageElement from "@/components/widget/MessageElement";
import { useScreenshotStore } from "@/components/widget/widgetState";
import { sendScreenshot } from "@/lib/widget/messages";

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
  addToolResult: (options: { toolCallId: string; result: unknown }) => void;
  data: JSONValue[] | null;
  color: "black" | "gumroad-pink";
};

export default function Message({ message, conversationSlug, token, addToolResult, data, color }: Props) {
  const { screenshot, setScreenshot } = useScreenshotStore();

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

  const screenshotInvocation = message.toolInvocations?.find(
    (invocation) => invocation.toolName === "take_screenshot" && invocation.state !== "result",
  );

  useEffect(() => {
    if (screenshot?.response && screenshotInvocation) {
      addToolResult({
        toolCallId: screenshotInvocation.toolCallId,
        result: { data: screenshot.response },
      });
      setScreenshot(null);
    }
  }, [screenshot, screenshotInvocation]);

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
        <MessageElement
          messageId={persistedId?.toString()}
          conversationSlug={conversationSlug}
          message={message}
          reasoning={reasoning}
          token={token}
          color={color}
        />
        {screenshotInvocation ? (
          <div key={screenshotInvocation.toolCallId} className="flex items-center gap-2 p-4 border-t border-black">
            <p className="mr-auto">Allow Helper to take a screenshot?</p>
            <button
              onClick={() => addToolResult({ toolCallId: screenshotInvocation.toolCallId, result: { data: null } })}
              className="flex h-8 px-3 items-center justify-center rounded-md text-sm transition-all duration-300 ease-in-out border border-black hover:bg-[#FF90E7]"
            >
              Deny
            </button>
            <button
              onClick={() => sendScreenshot()}
              className="flex h-8 px-3 items-center justify-center rounded-md bg-black text-sm text-white transition-all duration-300 ease-in-out border border-black hover:bg-[#FF90E7] hover:text-black"
            >
              Allow
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400" title={message.createdAt ? message.createdAt.toLocaleString() : ""}>
          {message.createdAt ? <HumanizedTime time={message.createdAt.toISOString()} /> : null}
        </span>
      </div>
    </div>
  );
}
