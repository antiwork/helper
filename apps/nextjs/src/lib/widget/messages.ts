import { findInteractiveElements } from "@/sdk/domTree";

export type WidgetMessage = {
  action: string;
  content?: any;
};

export const READY_ACTION = "READY";
export const CLOSE_ACTION = "CLOSE";
export const CONVERSATION_UPDATE_ACTION = "CONVERSATION_UPDATE";
export const SCREENSHOT_ACTION = "SCREENSHOT";
export const MINIMIZE_ACTION = "MINIMIZE";
export const MESSAGE_TYPE = "HELPER_WIDGET_MESSAGE";
export const GUIDE_START = "GUIDE_START";
export const GUIDE_DONE = "GUIDE_DONE";
export const RESUME_GUIDE = "RESUME_GUIDE";
export const EXECUTE_GUIDE_ACTION = "EXECUTE_GUIDE_ACTION";

export const sendMessageToParent = (message: WidgetMessage) => {
  window.parent.postMessage(
    {
      type: MESSAGE_TYPE,
      payload: message,
    },
    "*",
  );
};

export const sendReadyMessage = () => {
  sendMessageToParent({ action: READY_ACTION });
};

export const closeWidget = () => {
  sendMessageToParent({ action: CLOSE_ACTION });
};

export const sendConversationUpdate = (conversationSlug: string | null) => {
  sendMessageToParent({
    action: CONVERSATION_UPDATE_ACTION,
    content: { conversationSlug },
  });
};

export const sendScreenshot = () => {
  sendMessageToParent({
    action: SCREENSHOT_ACTION,
  });
};

export const minimizeWidget = () => {
  sendMessageToParent({
    action: MINIMIZE_ACTION,
  });
};

// Promise-based message sending to parent window
export function sendRequestToParent<T>(action: string, content?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `req_${Math.random().toString(36).substring(2, 9)}`;

    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent || !event.data || event.data.type !== MESSAGE_TYPE) return;

      const { responseId, response, error } = event.data.payload || {};
      if (responseId === requestId) {
        window.removeEventListener("message", handler);
        if (error) {
          reject(new Error(error));
        } else {
          resolve(response as T);
        }
      }
    };

    window.addEventListener("message", handler);

    // Set timeout to avoid hanging promises
    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Request timed out"));
    }, 5000);

    window.parent.postMessage(
      {
        type: MESSAGE_TYPE,
        payload: {
          action,
          requestId,
          content,
        },
      },
      "*",
    );
  });
}

export const fetchCurrentPageDetails = async (): Promise<{
  currentPageDetails: { url: string; title: string };
  clickableElements?: string;
  interactiveElements?: ReturnType<typeof findInteractiveElements>;
}> => {
  return await sendRequestToParent("FETCH_PAGE_DETAILS");
};

export const executeGuideAction = async (
  actionType: string,
  params: Record<string, any>,
  currentState: Record<string, any>,
) => {
  return await sendRequestToParent(EXECUTE_GUIDE_ACTION, { actionType, params, currentState });
};

export const guideDone = async (success = true) => {
  return await sendRequestToParent(GUIDE_DONE, {
    success,
  });
};

export const sendStartGuide = (sessionId: string) => {
  sendMessageToParent({ action: GUIDE_START, content: { sessionId } });
};
