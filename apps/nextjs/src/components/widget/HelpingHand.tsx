import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { closeWidget, executeGuideAction, fetchCurrentPageDetails, guideDone } from "@/lib/widget/messages";

const INITIAL_PROMPT = `
Your ultimate task is: """INSTRUCTIONS""". 
If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.
    
Current URL: {{CURRENT_URL}}
Current Page Title: {{CURRENT_PAGE_TITLE}}

{{PAGE_DETAILS}}`;

export default function HelpingHand({
  instructions,
  callId,
  token,
}: {
  instructions: string;
  callId: string | null;
  token: string;
}) {
  const [toolPending, setToolPending] = useState<{
    toolCallId: string;
    toolName: string;
    params: Record<string, any>;
  } | null>(null);

  const { messages, append, addToolResult } = useChat({
    api: "/api/ai-guide",
    maxSteps: 10,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      console.log("toolCall", toolCall);
      const params = toolCall.args as Record<string, any>;
      setToolPending({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        params,
      });

      console.log("Next goal:", params.current_state.next_goal);

      if (params.action.length > 0) {
        handleAction(params.action[0], toolCall.toolCallId);
      }
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

  const handleAction = async (action: Record<string, any>, toolCallId: string) => {
    const type = Object.keys(action)[0];
    if (!type) return;
    const params = action[type];

    if (type === "done") {
      closeWidget();
      await guideDone();
      return;
    }

    // General handler for all action types
    const result = await executeGuideAction(type, params);
    console.log(`${type} result:`, result);

    if (result && toolCallId) {
      const pageDetails = await fetchCurrentPageDetails();
      const resultMessage = `
      Executed the last action: ${type}.

      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      Elements: ${pageDetails.clickableElements}
      `;

      addToolResult({
        toolCallId,
        result: resultMessage,
      });
    }
  };

  const sendInitialPrompt = async () => {
    const pageDetails = await fetchCurrentPageDetails();
    console.log(pageDetails);
    append({
      role: "user",
      content: INITIAL_PROMPT.replace("INSTRUCTIONS", instructions)
        .replace("{{CURRENT_URL}}", pageDetails.currentPageDetails.url)
        .replace("{{CURRENT_PAGE_TITLE}}", pageDetails.currentPageDetails.title)
        .replace("{{PAGE_DETAILS}}", JSON.stringify(pageDetails.clickableElements)),
    });
  };

  const handleActionDone = async () => {
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
    if (instructions && instructions.length > 0) {
      sendInitialPrompt();
    }
  }, [instructions]);

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
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={handleActionDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
