import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import cx from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_INITIAL_PROMPT } from "@/lib/ai/constants";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import {
  cancelGuide,
  executeGuideAction,
  fetchCurrentPageDetails,
  guideDone,
  sendStartGuide,
  showWidget,
} from "@/lib/widget/messages";
import { GuideInstructions, Step } from "@/types/guide";
import { AISteps } from "./ai-steps";

type Status = "initializing" | "running" | "error" | "done" | "cancelled" | "pending-resume";

type PendingConfirmation = {
  actionToolCallId: string;
  action: any;
  context: any;
  description: string;
};

export default function HelpingHand({
  title,
  instructions,
  conversationSlug,
  token,
  toolCallId,
  stopChat,
  addChatToolResult,
  resumeGuide,
  pendingResume = false,
  existingSessionId,
  color,
}: {
  title: string;
  instructions: string;
  conversationSlug: string | null;
  token: string;
  toolCallId: string;
  stopChat: () => void;
  addChatToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  resumeGuide: GuideInstructions | null;
  pendingResume?: boolean;
  existingSessionId?: string;
  color: string;
}) {
  const [guideSessionId, setGuideSessionId] = useState<string | null>(existingSessionId ?? null);
  const [status, setStatus] = useState<Status>(pendingResume ? "pending-resume" : "initializing");
  const [steps, setSteps] = useState<Step[]>([]);
  const [toolResultCount, setToolResultCount] = useState(0);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const lastSerializedStepsRef = useRef<string>(JSON.stringify([]));
  const sessionIdRef = useRef<string | null>(null);
  const stepsRef = useRef<Step[]>([]);

  useEffect(() => {
    sessionIdRef.current = guideSessionId;
  }, [guideSessionId]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    if (!resumeGuide && status === "initializing" && !existingSessionId) {
      stopChat();
      initializeGuideSession();
    }
  }, [resumeGuide, status, existingSessionId]);

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

  const prepareRequestBody = useCallback((options: { id: string; messages: UIMessage[]; requestBody?: object }) => {
    return {
      id: options.id,
      message: options.messages[options.messages.length - 1],
      sessionId: sessionIdRef.current,
      steps: stepsRef.current,
      ...options.requestBody,
    };
  }, []);

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
        const newSteps = stepsRef.current.map((step, index) => ({
          ...step,
          completed: completedSteps.includes(index + 1),
        }));

        setSteps(newSteps);
      }
    },
    experimental_prepareRequestBody: prepareRequestBody,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const trackToolResult = (actionToolCallId: string, result: string) => {
    if (toolResultCount >= 10) {
      const message = "Failed to complete the task, too many attempts";
      guideDone(false, message);
      setStatus("error");
      addChatToolResult({
        toolCallId: actionToolCallId,
        result:
          "Failed to complete the task, too many attempts. Return the text instructions instead and inform about the issue",
      });
      return false;
    }
    setToolResultCount((prevCount) => prevCount + 1);
    addToolResult({
      toolCallId: actionToolCallId,
      result,
    });
    return true;
  };

  const handleAction = async (action: any, actionToolCallId: string, context: any) => {
    const type = action.type;
    if (!type) return;

    const params = Object.fromEntries(Object.entries(action).filter(([key]) => key !== "type"));

    if (type === "done") {
      const message = action.text || "Task completed successfully";
      await guideDone(action.success, message);
      setStatus("done");
      addChatToolResult({
        toolCallId,
        result: message,
      });
      return;
    }

    if (type === "click_element" && params.hasSideEffects === true) {
      setPendingConfirmation({
        actionToolCallId,
        action,
        context,
        description: (params.sideEffectDescription as string) || "This action may have side effects",
      });
      showWidget();
      return;
    }

    await executeActionAndTrackResult(type, params, context, actionToolCallId);
  };

  const executeActionAndTrackResult = async (type: string, params: any, context: any, actionToolCallId: string) => {
    const result = await executeGuideAction(type, params, context);

    let additionalInstructions = "";
    if (type === "input_text") {
      additionalInstructions = `
      Use the required attribute to check if there are other required inputs in the form and plan to fill them even if they are not planned in the steps and before you submit the form.
      <input> and <button> elements can have a form attribute. Use it to identify which form the input belongs to and check for required inputs in the form.`;
    }

    if (result && actionToolCallId) {
      const pageDetails = await fetchCurrentPageDetails();
      const resultMessage = `Executed the last action: ${type}.
        
      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      Elements: ${pageDetails.clickableElements} 
      ${additionalInstructions}`;

      trackToolResult(actionToolCallId, resultMessage);
    } else {
      const pageDetails = await fetchCurrentPageDetails();
      trackToolResult(actionToolCallId, `Failed to execute action. Current elements: ${pageDetails.clickableElements}`);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;

    const { action, context, actionToolCallId } = pendingConfirmation;
    setPendingConfirmation(null);

    const type = action.type;
    const params = Object.fromEntries(Object.entries(action).filter(([key]) => key !== "type"));

    await executeActionAndTrackResult(type, params, context, actionToolCallId);
  };

  const handleCancelAction = async () => {
    if (!pendingConfirmation) return;

    const { actionToolCallId } = pendingConfirmation;
    setPendingConfirmation(null);

    const pageDetails = await fetchCurrentPageDetails();
    trackToolResult(actionToolCallId, `Action cancelled by user. Current elements: ${pageDetails.clickableElements}`);
  };

  const initializeGuideSession = async () => {
    try {
      setStatus("initializing");
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
      sessionIdRef.current = data.sessionId; // Immediately update ref
      const steps = data.steps.map((step: string) => ({
        description: step,
        completed: false,
      }));
      setSteps(steps);
      stepsRef.current = steps;
      setStatus("running");
      sendInitialPrompt({ resumed: false });
      sendStartGuide(data.sessionId);
    } catch (error) {
      captureExceptionAndLog(error);
      setStatus("error");
    }
  };

  const sendInitialPrompt = async ({ resumed }: { resumed: boolean }) => {
    const pageDetails = await fetchCurrentPageDetails();
    let content = GUIDE_INITIAL_PROMPT.replace("INSTRUCTIONS", instructions)
      .replace("{{CURRENT_URL}}", pageDetails.currentPageDetails.url)
      .replace("{{CURRENT_PAGE_TITLE}}", pageDetails.currentPageDetails.title)
      .replace("{{PAGE_DETAILS}}", JSON.stringify(pageDetails.clickableElements));

    if (resumed) {
      content += `\n\nWe are resuming the guide. Check if the steps are still valid based on the current page elements.`;
    }

    append({ role: "user", content });
  };

  const cancelGuideAction = () => {
    cancelGuide();
    setStatus("cancelled");
    addChatToolResult({
      toolCallId,
      result: "User cancelled the guide. Send text instructions instead.",
    });
  };

  useEffect(() => {
    if (!guideSessionId || !token) return;

    const serializedSteps = JSON.stringify(steps);
    if (serializedSteps === lastSerializedStepsRef.current) return;

    const handler = setTimeout(() => {
      updateStepsBackend(stepsRef.current);
      lastSerializedStepsRef.current = serializedSteps;
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [steps, guideSessionId, token]);

  useEffect(() => {
    if (resumeGuide && resumeGuide.sessionId === guideSessionId) {
      setStatus("running");
      sendInitialPrompt({ resumed: true });
      setSteps(resumeGuide.steps);
    }
  }, [resumeGuide]);

  if (status === "pending-resume" || status === "cancelled") {
    return null;
  }

  const loadingClasses = `absolute top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-${color}`;

  return (
    <>
      <MessageWrapper status={status}>
        {status === "running" || status === "done" ? (
          <>
            <div className="flex items-center mb-4">
              <p className="text-base font-medium">{title}</p>
            </div>
            <AISteps
              steps={steps.map((step, index) => ({ ...step, id: `step-${index}` }))}
              isDone={status === "done"}
            />

            {pendingConfirmation && (
              <div className="mt-4 p-3 border border-yellow-500 bg-yellow-50 rounded-md">
                <p className="text-sm font-medium text-yellow-700 mb-2">Confirmation Required</p>
                <p className="text-xs mb-3">{pendingConfirmation.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmAction}
                    className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-md"
                  >
                    Proceed
                  </button>
                  <button
                    onClick={handleCancelAction}
                    className="text-xs border border-yellow-600 text-yellow-700 px-2 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs">Planning steps...</p>
            <div className="relative h-4 w-20 overflow-hidden rounded-lg">
              <div className={`${loadingClasses} ball-1`}></div>
              <div className={`${loadingClasses} ball-2`}></div>
              <div className={`${loadingClasses} ball-3`}></div>
              <div className={`${loadingClasses} ball-4`}></div>
            </div>
          </div>
        )}
      </MessageWrapper>

      {status === "running" && !pendingConfirmation && (
        <div className="flex justify-start">
          <button onClick={cancelGuideAction} className="flex items-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.9999 11.6004C9.0927 11.6004 11.5999 9.09318 11.5999 6.00039C11.5999 2.9076 9.0927 0.400391 5.9999 0.400391C2.90711 0.400391 0.399902 2.9076 0.399902 6.00039C0.399902 9.09318 2.90711 11.6004 5.9999 11.6004ZM4.5999 3.90039C4.2133 3.90039 3.8999 4.21379 3.8999 4.60039V7.40039C3.8999 7.78699 4.2133 8.10039 4.5999 8.10039H7.3999C7.7865 8.10039 8.0999 7.78699 8.0999 7.40039V4.60039C8.0999 4.21379 7.7865 3.90039 7.3999 3.90039H4.5999Z"
                fill="black"
              />
            </svg>
            <span className="underline text-xs">Just tell me how</span>
          </button>
        </div>
      )}
    </>
  );
}

const MessageWrapper = ({ children, status }: { children: React.ReactNode; status: Status }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className={cx("rounded-lg max-w-full border border-black bg-background text-foreground", {
          "border-green-900": status === "done",
          "border-red-900": status === "error",
        })}
      >
        <div className="relative p-4">{children}</div>
      </div>
    </div>
  );
};
