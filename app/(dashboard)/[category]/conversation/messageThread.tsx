import { HelpCircle } from "lucide-react";
import { EventItem } from "@/app/(dashboard)/[category]/conversation/eventItem";
import MessageItem from "@/app/(dashboard)/[category]/conversation/messageItem";
import type { Message } from "@/app/types/global";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToolMetadata } from "@/db/schema";
import { ConversationWithNewMessages } from "./conversation";
import GuideSessionItem from "./guideSessionItem";
import { ToolItem } from "./toolItem";

export const MessageThread = ({
  conversation,
  onPreviewAttachment,
}: {
  conversation: ConversationWithNewMessages;
  onPreviewAttachment: (message: Message, index: number) => void;
}) => {
  return (
    <div className="flex h-full flex-col" data-testid="message-thread">
      <div className="flex flex-1 flex-col gap-8">
        {conversation.isPrompt && (
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Started this conversation from a prompt</span>
          </div>
        )}
        {conversation.messages.map((message, index) =>
          message.type === "event" ? (
            <EventItem key={message.id} event={message} />
          ) : message.type === "guide_session" ? (
            <GuideSessionItem key={message.id} guideSession={message} />
          ) : message.role === "tool" && message.type === "message" ? (
            <ToolItem
              key={message.id}
              message={{ ...message, metadata: message.metadata as ToolMetadata }}
              initialExpanded={index === conversation.messages.length - 1}
            />
          ) : (
            <MessageItem
              key={`${message.type}-${message.id}`}
              message={message}
              conversation={conversation}
              onPreviewAttachment={
                message.type === "message" && message.files.length
                  ? (index) => onPreviewAttachment(message, index)
                  : undefined
              }
            />
          ),
        )}
        {conversation.summary && conversation.summary.length > 0 && (
          <div className="mx-auto flex max-w-2xl flex-col">
            <Accordion type="single" collapsible>
              <AccordionItem value="summary" className="border-none">
                <AccordionTrigger className="flex items-center gap-1 text-base text-muted-foreground hover:no-underline px-4 py-2 mx-auto mb-4 border rounded flex-none">
                  Conversation summary
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="flex flex-col">
                    {conversation.summary.map((point, index) => (
                      <div key={index} className="flex gap-3 text-base relative">
                        <div className="flex h-full flex-col items-center">
                          <div className={`absolute top-0 h-3 w-px bg-border ${index === 0 ? "opacity-0" : ""}`}></div>
                          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border"></div>
                          <div
                            className={`absolute top-4 bottom-0 w-px bg-border ${conversation.summary && index === conversation.summary.length - 1 ? "opacity-0" : ""}`}
                          ></div>
                        </div>
                        <div className="pb-4">{point}</div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};
