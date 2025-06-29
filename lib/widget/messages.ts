import {
  CANCEL_GUIDE,
  CLOSE_ACTION,
  CONVERSATION_UPDATE_ACTION,
  EXECUTE_GUIDE_ACTION,
  GUIDE_DONE,
  GUIDE_START,
  InteractiveElement,
  MESSAGE_TYPE,
  READY_ACTION,
  SCREENSHOT_ACTION,
  SHOW_WIDGET,
  TOGGLE_HEIGHT_ACTION,
  WidgetMessage,
} from "@helperai/sdk";

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

export const toggleWidgetHeight = () => {
  sendMessageToParent({
    action: TOGGLE_HEIGHT_ACTION,
  });
};

// Promise-based message sending to parent window
function sendRequestToParent<T>(action: string, content?: any): Promise<T> {
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
      reject(new Error(`Request timed out - ${action}`));
    }, 6000);

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
  interactiveElements?: InteractiveElement[];
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

export const guideDone = async (success = true, message?: string) => {
  return await sendRequestToParent(GUIDE_DONE, {
    success,
    message,
  });
};

export const sendStartGuide = (sessionId: string) => {
  sendMessageToParent({ action: GUIDE_START, content: { sessionId } });
};

export const cancelGuide = () => {
  sendRequestToParent(CANCEL_GUIDE);
};

export const showWidget = () => {
  sendMessageToParent({ action: SHOW_WIDGET });
};
