import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { fetchCurrentPageDetails } from "@/lib/widget/messages";

type GuideInstructions = {
  instructions: string;
  callId: string | null;
};

const INITIAL_PROMPT = `
Your ultimate task is: """INSTRUCTIONS""". If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.
    
Current URL: {{CURRENT_URL}}
Current Page Title: {{CURRENT_PAGE_TITLE}}

{{PAGE_DETAILS}}
`;

export default function HelpingHand({
  guideInstructions,
  token,
}: {
  guideInstructions: GuideInstructions;
  token: string;
}) {
  const [toolPending, setToolPending] = useState<{
    toolCallId: string;
    toolName: string;
    params: Record<string, any>;
  } | null>(null);

  const { messages, append, addToolResult } = useChat({
    api: "/api/ai-guide",
    maxSteps: 20,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      setToolPending({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        params: toolCall.args as Record<string, any>,
      });
      console.log(toolCall);
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        messages,
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const sendInitialPrompt = async () => {
    const pageDetails = await fetchCurrentPageDetails();
    console.log(pageDetails);
    append({
      role: "user",
      content: INITIAL_PROMPT.replace("INSTRUCTIONS", guideInstructions.instructions)
        .replace("{{CURRENT_URL}}", pageDetails.currentPageDetails.url)
        .replace("{{CURRENT_PAGE_TITLE}}", pageDetails.currentPageDetails.title)
        .replace("{{PAGE_DETAILS}}", JSON.stringify(pageDetails.clickableElements)),
    });
  };

  const handleDone = async () => {
    if (toolPending) {
      const pageDetails = await fetchCurrentPageDetails();
      const result = `
      Execute the last action.

      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      ${JSON.stringify(pageDetails.clickableElements)}
      `;
      addToolResult({
        toolCallId: toolPending.toolCallId,
        result,
      });
    }
  };

  useEffect(() => {
    if (guideInstructions && guideInstructions.instructions.length > 0) {
      sendInitialPrompt();
    }
  }, [guideInstructions]);

  return (
    <div className="flex flex-col h-72 w-full items-center px-4 text-sm text-gray-500 overflow-y-auto">
      <div className="flex flex-col gap-2 w-full">
        {messages.map((message) => (
          <div className="flex flex-col gap-2 rounded-lg p-2 border border-gray-200" key={message.id}>
            <div className="text-sm text-gray-500">{message.role}</div>
            <div className="text-sm text-gray-500">{message.content}</div>
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-lg p-2 border border-gray-200">
          <div className="text-sm text-gray-500">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
