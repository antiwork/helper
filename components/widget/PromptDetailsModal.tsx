import type { Message } from "ai";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { PromptInfo } from "@/lib/ai/promptInfo";

type Props = {
  onClose: () => void;
  message: Message;
  promptInfo: PromptInfo;
};

export default function PromptDetailsModal({ onClose, message, promptInfo }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toolInvocations = message.parts?.filter((part) => part.type === "tool-invocation") || [];

  const promptSections = [
    { key: "systemPrompt", title: "System Prompt", content: promptInfo.systemPrompt },
    { key: "knowledgeBank", title: "Knowledge Bank", content: promptInfo.knowledgeBank },
    { key: "websitePagesPrompt", title: "Website Pages", content: promptInfo.websitePagesPrompt },
    { key: "userPrompt", title: "User Prompt", content: promptInfo.userPrompt },
  ].filter((section) => section.content);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-start justify-between border-b border-black p-1.5">
        <h2 className="text-base leading-5 text-foreground">Generated message details</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Response Text</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <ReactMarkdown className="prose prose-sm max-w-none text-gray-700">{message.content}</ReactMarkdown>
          </div>
        </div>

        {promptSections.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Prompt</h3>
            <div className="space-y-2">
              {promptSections.map((section) => (
                <div key={section.key} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    {expandedSections[section.key] ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedSections[section.key] && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded p-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{section.content}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {toolInvocations.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Tool Calls</h3>
            <div className="space-y-3">
              {toolInvocations.map((part, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2">{part.toolInvocation.toolName}</div>
                  {part.toolInvocation.args && Object.keys(part.toolInvocation.args).length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">Arguments:</div>
                      <div className="bg-gray-50 rounded p-2">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(part.toolInvocation.args, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {part.toolInvocation.state === "result" &&
                    "result" in part.toolInvocation &&
                    part.toolInvocation.result && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Result:</div>
                        <div className="bg-gray-50 rounded p-2">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {typeof part.toolInvocation.result === "string"
                              ? part.toolInvocation.result
                              : JSON.stringify(part.toolInvocation.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
