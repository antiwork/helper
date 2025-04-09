import { JSONValue } from "ai";
import { useStickToBottom } from "use-stick-to-bottom";
import Message, { MessageWithReaction } from "@/components/widget/Message";

type Props = {
  data: JSONValue[] | null;
  messages: MessageWithReaction[];
  conversationSlug: string | null;
  isGumroadTheme: boolean;
  token: string | null;
  startGuide: () => void;
  cancelGuide: (toolCallId: string) => void;
};

export default function MessagesList({
  data,
  messages,
  conversationSlug,
  isGumroadTheme,
  token,
  startGuide,
  cancelGuide,
}: Props) {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div className="flex-1 overflow-y-auto p-4" id="message-container" ref={scrollRef}>
      <div className="flex flex-col gap-6 pb-32" ref={contentRef}>
        {messages.map((message, index) => (
          <Message
            key={index}
            message={message}
            conversationSlug={conversationSlug}
            token={token}
            data={index === messages.length - 1 ? data : null}
            color={isGumroadTheme ? "gumroad-pink" : "black"}
            startGuide={startGuide}
            cancelGuide={cancelGuide}
          />
        ))}
      </div>
    </div>
  );
}
