import { JSONValue } from "ai";
import { Fragment } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { Attachment } from "@/components/widget/Conversation";
import HelpingHand from "@/components/widget/HelpingHand";
import Message, { MessageWithReaction } from "@/components/widget/Message";
import { cn } from "@/lib/utils";
import { GuideInstructions } from "@/types/guide";
import LoadingMessage from "./LoadingMessage";

type Props = {
  data: JSONValue[] | null;
  messages: MessageWithReaction[];
  allAttachments: Attachment[];
  conversationSlug: string | null;
  isGumroadTheme: boolean;
  token: string | null;
  stopChat: () => void;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  resumeGuide: GuideInstructions | null;
  status: string;
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
  resumeGuide,
  status,
}: Props) {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-4",
        "[scrollbar-color:var(--scrollbar-color,rgba(0,0,0,0.4))_transparent]",
        "[&::-webkit-scrollbar]{height:4px}",
        "[&::-webkit-scrollbar-thumb]{background:rgba(0,0,0,0.4)}",
        "dark:[&::-webkit-scrollbar-thumb]{background:rgba(0,0,0,0.4)}",
        "dark:[--scrollbar-color:rgba(0,0,0,0.4)]",
      )}
      id="message-container"
      ref={scrollRef}
      data-testid="messages-list"
    >
      <div className="flex flex-col gap-3" ref={contentRef}>
        {messages.length === 0 && status === "ready" && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <p className="text-sm">Start a conversation by typing a message below</p>
            </div>
          </div>
        )}
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
            const pendingResume = args.pendingResume;
            const sessionId = args.sessionId;

            return (
              <Fragment key={`${message.id || index}-guide-tool`}>
                <HelpingHand
                  key={`${message.id || index}-guide`}
                  conversationSlug={conversationSlug}
                  token={token}
                  toolCallId={toolCallId}
                  instructions={instructions}
                  title={title}
                  stopChat={stopChat}
                  addChatToolResult={addToolResult}
                  pendingResume={pendingResume}
                  resumeGuide={resumeGuide}
                  existingSessionId={sessionId}
                  color={isGumroadTheme ? "gumroad-pink" : "primary"}
                />
                {hasResult && (
                  <Message
                    key={`${message.id || index}-guide-result`}
                    message={message}
                    allMessages={messages}
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
              allMessages={messages}
              attachments={allAttachments.filter((a) => a.messageId === message.id)}
              conversationSlug={conversationSlug}
              token={token}
              data={index === messages.length - 1 ? data : null}
              hideReasoning={true}
              color={isGumroadTheme ? "gumroad-pink" : "primary"}
            />
          );
        })}

        {status === "submitted" && (
          <div className="flex flex-col gap-3">
            <LoadingMessage color={isGumroadTheme ? "gumroad-pink" : "primary"} />
          </div>
        )}
      </div>
    </div>
  );
}
