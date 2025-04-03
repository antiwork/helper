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
  domTracking: any;
  clickableElements?: string;
  interactiveElements?: ReturnType<typeof findInteractiveElements>;
}> => {
  return await sendRequestToParent("FETCH_PAGE_DETAILS");
};

export const clickElement = async (index: number) => {
  return await sendRequestToParent("CLICK_ELEMENT", { index });
};

export const selectDropdownOption = async (index: number, text: string) => {
  return await sendRequestToParent("SELECT_DROPDOWN_OPTION", { index, text });
};

export const guideDone = async () => {
  return await sendRequestToParent("GUIDE_DONE");
};
