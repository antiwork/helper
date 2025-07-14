// This file is used for the NPM package output and is meant to be imported into the Next.js app

export type { InteractiveElement } from "./domTree";

export type HelperWidgetConfig = {
  title?: string;
  email?: string;
  emailHash?: string;
  timestamp?: number;
  customerMetadata?: {
    name?: string | null;
    value?: number | null;
    links?: Record<string, string> | null;
  } | null;
  iconColor?: string | null;
  experimentalReadPage?: boolean;
  showToggleButton?: boolean;
  enableGuide?: boolean;
  theme?: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
  viewportWidth?: number;
};

export type ReadPageToolConfig = {
  toolName: string;
  toolDescription: string;
  pageHTML: string;
  pageContent: string;
};

export type NotificationStatus = "pending" | "sent" | "read" | "dismissed";

export type GuideSessionEventType =
  | "session_started"
  | "step_added"
  | "step_completed"
  | "step_updated"
  | "action_performed"
  | "completed"
  | "abandoned"
  | "paused"
  | "resumed";

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
