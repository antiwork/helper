import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { GUIDE_INITIAL_PROMPT } from "@/lib/ai/constants";
import {
  closeWidget,
  executeGuideAction,
  fetchCurrentPageDetails,
  guideDone,
  sendStartGuide,
} from "@/lib/widget/messages";
import LoadingSpinner from "../loadingSpinner";
import { AISteps } from "./ai-steps";

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
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);

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

      if (params.current_state) {
        const completedSteps = params.current_state.completed_steps || [];
        setSteps(
          steps.map((step, index) => ({
            ...step,
            completed: completedSteps.includes(index + 1),
          })),
        );
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        messages,
        sessionId: guideSessionId,
        steps,
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const trackToolResult = (toolCallId: string, result: string) => {
    if (toolResultCount >= 10) {
      guideDone(false);
      setDone({ success: false, message: "Failed to complete the task, too many attempts" });
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
      await guideDone(action.success);
      setDone({ success: action.success, message: action.text });
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
      content: GUIDE_INITIAL_PROMPT.replace("INSTRUCTIONS", instructions)
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

  if (done) {
    return (
      <div className="flex flex-col h-72 w-full items-center p-4 text-sm overflow-y-auto text-white">
        <p>{done.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-72 w-full items-center p-4 text-sm overflow-y-auto text-white">
      {steps.length > 0 ? (
        <AISteps steps={steps.map((step, index) => ({ ...step, id: `step-${index}` }))} />
      ) : (
        <div className="flex flex-col gap-2">
          <LoadingSpinner />
          <p>Thinking...</p>
        </div>
      )}
    </div>
  );
}
