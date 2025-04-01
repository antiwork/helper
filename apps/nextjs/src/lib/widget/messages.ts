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
