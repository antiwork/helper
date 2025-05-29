import type { Message } from "ai";
import { ChevronDown, ChevronRight, Info, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { JsonView } from "@/components/jsonView";
import { PromptInfo } from "@/lib/ai/promptInfo";

type Props = {
  onClose: () => void;
  allMessages: Message[];
  message: Message;
  promptInfo: PromptInfo;
};

export default function PromptDetailsModal({ onClose, allMessages, message, promptInfo }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toolInvocations = message.parts?.filter((part) => part.type === "tool-invocation") || [];

  const promptSections = [
    { key: "systemPrompt", title: "System prompt", content: promptInfo.systemPrompt },
    { key: "knowledgeBank", title: "Knowledge bank", content: promptInfo.knowledgeBank },
    {
      key: "websitePagesPrompt",
      title: "Website pages",
      content: promptInfo.websitePages
        .map((page) => `- [${page.title}](${page.url}) (${Math.round(page.similarity * 100)}% match)`)
        .join("\n"),
    },
    { key: "userPrompt", title: "User info", content: promptInfo.userPrompt },
  ].filter((section) => section.content);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between border-b border-black p-1.5">
        <h2 className="ml-2 text-base leading-5 text-foreground">Generated message details</h2>
        <button onClick={onClose} className="text-primary hover:text-muted-foreground p-1 rounded-full hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold mb-2">Response Text</h3>
          <div className="border border-black rounded-lg p-4">
            <ReactMarkdown className="prose prose-sm max-w-none">{message.content}</ReactMarkdown>
          </div>
        </div>

        {promptSections.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold mb-2">Prompt</h3>
            <div className="space-y-2">
              {promptSections.map((section) => (
                <div key={section.key}>
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center gap-1 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {expandedSections[section.key] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{section.title}</span>
                  </button>
                  {expandedSections[section.key] && (
                    <ReactMarkdown className="pl-5 prose prose-sm max-w-none">{section.content}</ReactMarkdown>
                  )}
                </div>
              ))}
              <div>
                <button
                  onClick={() => toggleSection("messageThread")}
                  className="w-full flex items-center gap-1 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {expandedSections.messageThread ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">Message thread</span>
                </button>
                {expandedSections.messageThread && (
                  <div className="pl-5 space-y-3">
                    {allMessages
                      .filter((msg) => msg.createdAt && message.createdAt && msg.createdAt < message.createdAt)
                      .map((msg, index) => (
                        <ReactMarkdown
                          key={index}
                          className="prose prose-sm max-w-none"
                        >{`**${msg.role === "user" ? "User" : "Assistant"}:** ${msg.content}`}</ReactMarkdown>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {toolInvocations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold mb-2">Tool Calls</h3>
            <div className="space-y-3">
              {toolInvocations.map((part, index) => (
                <div key={index} className="flex flex-col gap-2 border-l border-black px-4 py-2">
                  <div className="text-sm font-medium text-gray-900">{part.toolInvocation.toolName}</div>
                  {part.toolInvocation.args && Object.keys(part.toolInvocation.args).length > 0 && (
                    <div className="text-xs font-mono">
                      <JsonView data={part.toolInvocation.args} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-black p-4 bg-background text-gray-600 flex items-center gap-2 justify-center">
        <Info className="h-4 w-4" />
        <p className="text-xs">Customers will not see this information</p>
      </div>
    </div>
  );
}
