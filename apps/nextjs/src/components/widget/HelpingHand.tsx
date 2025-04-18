import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import {
  closeWidget,
  executeGuideAction,
  fetchCurrentPageDetails,
  guideDone,
  sendStartGuide,
} from "@/lib/widget/messages";
import { AISteps } from "./ai-steps";

const INITIAL_PROMPT = `
Your ultimate task is: """INSTRUCTIONS""". 
If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.
    
Current URL: {{CURRENT_URL}}
Current Page Title: {{CURRENT_PAGE_TITLE}}

{{PAGE_DETAILS}}`;

type Step = {
  description: string;
  completed: boolean;
  active: boolean;
};

export default function HelpingHand({
  instructions,
  conversationSlug,
  token,
}: {
  instructions: string;
  conversationSlug: string | null;
  token: string;
}) {
  const [toolPending, setToolPending] = useState<{
    toolCallId: string;
    toolName: string;
    params: Record<string, any>;
  } | null>(null);
  const [guideSessionId, setGuideSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [toolResultCount, setToolResultCount] = useState(0);

  const { append, addToolResult } = useChat({
    api: "/api/guide/action",
    maxSteps: 10,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      const params = toolCall.args as Record<string, any>;
      setToolPending({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        params,
      });

      if (params.action) {
        handleAction(params.action, toolCall.toolCallId, params.current_state);
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        messages,
        sessionId: guideSessionId,
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const trackToolResult = (toolCallId: string, result: string) => {
    if (toolResultCount >= 10) {
      closeWidget();
      guideDone(false);
      return false;
    }
    setToolResultCount((prevCount) => prevCount + 1);
    addToolResult({
      toolCallId,
      result,
    });
    return true;
  };

  const handleAction = async (action: any, toolCallId: string, context: any) => {
    const type = action.type;
    if (!type) return;

    const params = Object.fromEntries(Object.entries(action).filter(([key]) => key !== "type"));

    if (type === "done") {
      closeWidget();
      await guideDone();
      return;
    }

    const result = await executeGuideAction(type, params, context);

    if (result && toolCallId) {
      const pageDetails = await fetchCurrentPageDetails();
      const resultMessage = `
      Executed the last action: ${type}.

      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      Elements: ${pageDetails.clickableElements}
      `;

      trackToolResult(toolCallId, resultMessage);
    }
  };

  const initializeGuideSession = async () => {
    try {
      setIsInitializing(true);
      const response = await fetch("/api/guide/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instructions,
          conversationSlug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create guide session");
      }

      const data = await response.json();
      setGuideSessionId(data.sessionId);
      setIsInitializing(false);
      setSteps(
        data.steps.map((step: string, index: number) => ({
          description: step,
          active: index === 0,
          completed: false,
        })),
      );
      sendStartGuide(data.sessionId);
    } catch (error) {
      setIsInitializing(false);
    }
  };

  const sendInitialPrompt = async () => {
    const pageDetails = await fetchCurrentPageDetails();
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
      trackToolResult(toolPending.toolCallId, result);
    }
  };

  useEffect(() => {
    if (instructions && instructions.length > 0) {
      initializeGuideSession();
    }
  }, [instructions]);

  useEffect(() => {
    if (guideSessionId && !isInitializing) {
      sendInitialPrompt();
    }
  }, [guideSessionId, isInitializing]);

  if (isInitializing) {
    return null;
  }

  return (
    <div className="flex flex-col h-72 w-full items-center px-4 text-sm text-gray-500 overflow-y-auto">
      <AISteps steps={steps.map((step, index) => ({ ...step, id: `step-${index}` }))} />

      <div className="flex flex-col gap-2 w-full">
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
