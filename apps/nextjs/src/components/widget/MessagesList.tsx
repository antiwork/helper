import { JSONValue } from "ai";
import { useStickToBottom } from "use-stick-to-bottom";
import { Attachment } from "@/components/widget/Conversation";
import HelpingHand from "@/components/widget/HelpingHand";
import Message, { MessageWithReaction } from "@/components/widget/Message";

type Props = {
  data: JSONValue[] | null;
  messages: MessageWithReaction[];
  allAttachments: Attachment[];
  conversationSlug: string | null;
  isGumroadTheme: boolean;
  token: string | null;
  stopChat: () => void;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
};

export default function MessagesList({
  data,
  messages,
  conversationSlug,
  allAttachments,
  isGumroadTheme,
  token,
  stopChat,
  addToolResult,
}: Props) {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div className="flex-1 overflow-y-auto p-4" id="message-container" ref={scrollRef}>
      <div className="flex flex-col gap-6 pb-32" ref={contentRef}>
        {messages.map((message, index) => {
          const guide = message.parts?.find(
            (part) => part.type === "tool-invocation" && part.toolInvocation.toolName === "guide_user",
          );

          if (guide && guide.type === "tool-invocation" && token) {
            const args = guide.toolInvocation.args;
            const title = args.title ?? "Untitled";
            const instructions = args.instructions ?? "No instructions";
            const toolCallId = guide.toolInvocation.toolCallId;
            return (
              <HelpingHand
                key={index}
                conversationSlug={conversationSlug}
                token={token}
                toolCallId={toolCallId}
                instructions={instructions}
                title={title}
                stopChat={stopChat}
                addChatToolResult={addToolResult}
              />
            );
          }

          return (
            <Message
              key={index}
              message={message}
              attachments={allAttachments.filter((a) => a.messageId === message.id)}
              conversationSlug={conversationSlug}
              token={token}
              data={index === messages.length - 1 ? data : null}
              color={isGumroadTheme ? "gumroad-pink" : "primary"}
            />
          );
        })}
      </div>
    </div>
  );
}
