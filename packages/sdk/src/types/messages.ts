export type WidgetMessage = {
  action: string;
  content?: any;
};

export const READY_ACTION = "READY";
export const CLOSE_ACTION = "CLOSE";
export const CONVERSATION_UPDATE_ACTION = "CONVERSATION_UPDATE";
export const SCREENSHOT_ACTION = "SCREENSHOT";
export const MINIMIZE_ACTION = "MINIMIZE_WIDGET";
export const MESSAGE_TYPE = "HELPER_WIDGET_MESSAGE";
export const GUIDE_START = "GUIDE_START";
export const GUIDE_DONE = "GUIDE_DONE";
export const RESUME_GUIDE = "RESUME_GUIDE";
export const EXECUTE_GUIDE_ACTION = "EXECUTE_GUIDE_ACTION";
export const CANCEL_GUIDE = "CANCEL_GUIDE";
export const SHOW_WIDGET = "SHOW_WIDGET";
export const TOGGLE_HEIGHT_ACTION = "TOGGLE_WIDGET_HEIGHT";
