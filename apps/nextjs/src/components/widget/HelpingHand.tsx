import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import cx from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { GUIDE_INITIAL_PROMPT } from "@/lib/ai/constants";
import {
  cancelGuide,
  executeGuideAction,
  fetchCurrentPageDetails,
  guideDone,
  sendStartGuide,
} from "@/lib/widget/messages";
import { GuideInstructions, Step } from "@/types/guide";
import { AISteps } from "./ai-steps";

type Status = "prompt" | "initializing" | "running" | "error" | "done" | "cancelled" | "pending-resume";

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
  const [status, setStatus] = useState<Status>(pendingResume ? "pending-resume" : "prompt");
  const [steps, setSteps] = useState<Step[]>([]);
  const [toolResultCount, setToolResultCount] = useState(0);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const lastSerializedStepsRef = useRef<string>(JSON.stringify([]));
  const sessionIdRef = useRef<string | null>(null);
  const stepsRef = useRef<Step[]>([]);

  useEffect(() => {
    sessionIdRef.current = guideSessionId;
  }, [guideSessionId]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

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
      guideDone(false);
      setDone({ success: false, message: "Failed to complete the task, too many attempts" });
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
      await guideDone(action.success);
      setDone({ success: action.success, message: action.text });
      setStatus("done");
      addChatToolResult({
        toolCallId,
        result: action.text,
      });
      return;
    }

    const result = await executeGuideAction(type, params, context);

    if (result && actionToolCallId) {
      const pageDetails = await fetchCurrentPageDetails();
      const resultMessage = `Executed the last action: ${type}.

      Now, the current URL is: ${pageDetails.currentPageDetails.url}
      Current Page Title: ${pageDetails.currentPageDetails.title}
      Elements: ${pageDetails.clickableElements}`;

      trackToolResult(actionToolCallId, resultMessage);
    } else {
      const pageDetails = await fetchCurrentPageDetails();
      trackToolResult(actionToolCallId, `Failed to execute action. Current elements: ${pageDetails.clickableElements}`);
    }
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
      const steps = data.steps.map((step: string, index: number) => ({
        description: step,
        completed: false,
      }));
      setSteps(steps);
      stepsRef.current = steps;
      setStatus("running");
      sendInitialPrompt({ resumed: false });
      sendStartGuide(data.sessionId);
    } catch (error) {
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
      content += `\n\nWe are resuming the guide. Check if the steps are still valid based on the current page details. Elements changed and use the last page details to continue the guide.`;
    }

    append({ role: "user", content });
  };

  const startGuide = () => {
    stopChat();
    initializeGuideSession();
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

  if (status === "prompt") {
    return (
      <MessageWrapper status={status}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Guide - {title}</p>
          <ReactMarkdown className="text-xs">{instructions}</ReactMarkdown>

          {status === "prompt" && (
            <div className="flex items-center gap-2">
              <button className="text-xs bg-black text-white px-2 py-1 rounded-md" onClick={startGuide}>
                Do it for me!
              </button>
              <button className="text-xs px-2 py-1 rounded-md underline" onClick={cancelGuideAction}>
                Just tell me how
              </button>
            </div>
          )}
        </div>
      </MessageWrapper>
    );
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

      {status === "running" && (
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
    <div className="flex flex-col gap-2 mr-9 items-start w-full">
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
