import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { GUIDE_INITIAL_PROMPT } from "@/lib/ai/constants";
import { executeGuideAction, fetchCurrentPageDetails, guideDone, sendStartGuide } from "@/lib/widget/messages";
import { Step } from "@/types/guide";
import LoadingSpinner from "../loadingSpinner";
import { AISteps } from "./ai-steps";

export default function HelpingHand({
  instructions,
  conversationSlug,
  token,
  initialSteps,
  resumed,
  existingSessionId,
}: {
  instructions: string;
  conversationSlug: string | null;
  token: string;
  initialSteps: Step[];
  resumed: boolean;
  existingSessionId: string | null;
}) {
  const [guideSessionId, setGuideSessionId] = useState<string | null>(existingSessionId);
  const [isInitializing, setIsInitializing] = useState(!resumed);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [toolResultCount, setToolResultCount] = useState(0);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const lastSerializedStepsRef = useRef<string>(JSON.stringify(initialSteps));

  const updateStepsBackend = async (updatedSteps: Step[]) => {
    if (!guideSessionId || !token) return;

    try {
      await fetch("/api/guide/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: guideSessionId, steps: updatedSteps }),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update guide steps:", error);
    }
  };

  const { append, addToolResult } = useChat({
    api: "/api/guide/action",
    maxSteps: 10,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      const params = toolCall.args as Record<string, any>;

      if (params.action) {
        handleAction(params.action, toolCall.toolCallId, params.current_state);
      }

      if (params.current_state) {
        const completedSteps = params.current_state.completed_steps || [];
        const newSteps = steps.map((step, index) => ({
          ...step,
          completed: completedSteps.includes(index + 1),
          active: false,
        }));

        const firstIncompleteIndex = newSteps.findIndex((step) => !step.completed);
        if (firstIncompleteIndex !== -1 && newSteps[firstIncompleteIndex]) {
          newSteps[firstIncompleteIndex].active = true;
        }

        setSteps(newSteps);
      }
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        message: messages[messages.length - 1],
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
      const resultMessage = `Executed the last action: ${type}.

      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      Elements: ${pageDetails.clickableElements}`;

      trackToolResult(toolCallId, resultMessage);
    } else {
      const pageDetails = await fetchCurrentPageDetails();
      trackToolResult(toolCallId, `Failed to execute action. Current elements: ${pageDetails.clickableElements}`);
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

  const sendInitialPrompt = async (resumed: boolean) => {
    const pageDetails = await fetchCurrentPageDetails();
    let content = GUIDE_INITIAL_PROMPT.replace("INSTRUCTIONS", instructions)
      .replace("{{CURRENT_URL}}", pageDetails.currentPageDetails.url)
      .replace("{{CURRENT_PAGE_TITLE}}", pageDetails.currentPageDetails.title)
      .replace("{{PAGE_DETAILS}}", JSON.stringify(pageDetails.clickableElements));

    if (resumed) {
      content += `\n\nWe are resuming the guide. Check if the steps are still valid based on the current page details. Elements changed and use the last page details to continue the guide.`;
    }

    append({
      role: "user",
      content,
    });
  };

  useEffect(() => {
    if (instructions && instructions.length > 0 && !resumed) {
      initializeGuideSession();
    }
  }, [instructions, resumed]);

  useEffect(() => {
    if (guideSessionId && !isInitializing) {
      sendInitialPrompt(resumed);
    }
  }, [guideSessionId, isInitializing]);

  useEffect(() => {
    if (!guideSessionId || !token) return;

    const serializedSteps = JSON.stringify(steps);
    if (serializedSteps === lastSerializedStepsRef.current) return;

    const handler = setTimeout(() => {
      updateStepsBackend(steps);
      lastSerializedStepsRef.current = serializedSteps;
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [steps, guideSessionId, token]);

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
        <div className="flex flex-col gap-2 text-white">
          <LoadingSpinner />
          <p>Thinking...</p>
        </div>
      )}
    </div>
  );
}
