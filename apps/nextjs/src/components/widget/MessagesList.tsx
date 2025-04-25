import { JSONValue, type Message as AIMessage } from "ai";
import { useStickToBottom } from "use-stick-to-bottom";
import { Attachment } from "@/components/widget/Conversation";
import HelpingHand from "@/components/widget/HelpingHand";
import Message, { MessageWithReaction } from "@/components/widget/Message";
import { Fragment } from "react";

type Props = {
  data: JSONValue[] | null;
  messages: MessageWithReaction[];
  allAttachments: Attachment[];
  conversationSlug: string | null;
  isGumroadTheme: boolean;
  token: string | null;
  stopChat: () => void;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  appendMessage: (role: AIMessage["role"], content: AIMessage["content"]) => void;
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
  appendMessage,
}: Props) {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div className="flex-1 overflow-y-auto p-4" id="message-container" ref={scrollRef}>
      <div className="flex flex-col gap-3 pb-16" ref={contentRef}>
        {messages.map((message, index) => {
          const guide = message.parts?.find(
            (part) => part.type === "tool-invocation" && part.toolInvocation.toolName === "guide_user",
          );

          if (guide && guide.type === "tool-invocation" && token) {
            const args = guide.toolInvocation.args;
            const title = args.title ?? "Untitled";
            const instructions = args.instructions ?? "No instructions";
            const toolCallId = guide.toolInvocation.toolCallId;
            const hasResult = guide.toolInvocation.state === "result";
            return (
              <Fragment key={`${message.id || index}-guide-tool`}>
                <HelpingHand
                  message={message}
                  key={`${message.id || index}-guide`}
                  conversationSlug={conversationSlug}
                  token={token}
                  toolCallId={toolCallId}
                  instructions={instructions}
                  title={title}
                  stopChat={stopChat}
                  addChatToolResult={addToolResult}
                  appendMessage={appendMessage}
                />
                {hasResult && (
                  <Message
                    key={`${message.id || index}-guide-result`}
                    message={message}
                    attachments={allAttachments.filter((a) => a.messageId === message.id)}
                    conversationSlug={conversationSlug}
                    token={token}
                    data={index === messages.length - 1 ? data : null}
                    color={isGumroadTheme ? "gumroad-pink" : "primary"}
                    hideReasoning={true}
                  />
                )}
              </Fragment>
            );
          }

          return (
            <Message
              key={`${message.id || index}-message`}
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
