import { useChat } from "@ai-sdk/react";
import { UIMessage, type Message as AIMessage } from "ai";
import cx from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { GUIDE_INITIAL_PROMPT } from "@/lib/ai/constants";
import { executeGuideAction, fetchCurrentPageDetails, guideDone, sendStartGuide } from "@/lib/widget/messages";
import { Step } from "@/types/guide";
import LoadingSpinner from "../loadingSpinner";
import { AISteps } from "./ai-steps";
import { MessageWithReaction } from "./Message";

type Status = "prompt" | "initializing" | "running" | "error" | "done" | "cancelled";

export default function HelpingHand({
  title,
  instructions,
  conversationSlug,
  token,
  toolCallId,
  stopChat,
  addChatToolResult,
  appendMessage,
  message,
}: {
  title: string;
  instructions: string;
  conversationSlug: string | null;
  token: string;
  toolCallId: string;
  stopChat: () => void;
  addChatToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  appendMessage: (role: AIMessage["role"], content: AIMessage["content"]) => void;
  message: MessageWithReaction;
}) {
  const [guideSessionId, setGuideSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("prompt");
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

  const cancelGuide = () => {
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

  if (status === "prompt" || status === "cancelled") {
    return (
      <MessageWrapper status={status}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Guide - {title}</p>
          <ReactMarkdown className="text-xs">{instructions}</ReactMarkdown>

          {status === "prompt" && (
            <div className="flex items-center gap-2">
              <button className="text-xs bg-green-200 px-2 py-1 rounded-md" onClick={startGuide}>
                Do it for me!
              </button>
              <button className="text-xs bg-gray-200 px-2 py-1 rounded-md" onClick={cancelGuide}>
                Receive text instructions
              </button>
            </div>
          )}
        </div>
      </MessageWrapper>
    );
  }

  return (
    <MessageWrapper status={status}>
      {status === "running" || status === "done" ? (
        <>
          <div className="flex items-center mb-4">
            <p className="text-base font-medium">{title}</p>
          </div>
          <AISteps steps={steps.map((step, index) => ({ ...step, id: `step-${index}` }))} />
        </>
      ) : (
        <div className="flex gap-2">
          <LoadingSpinner />
          <p>Thinking...</p>
        </div>
      )}
    </MessageWrapper>
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
