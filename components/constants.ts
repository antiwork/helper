import { env } from "@/lib/env";

export const HELPER_SUPPORT_MAILBOX_ID = 4;
export const HELPER_SUPPORT_EMAIL_FROM = "help@helper.ai";

export const EMAIL_UNDO_COUNTDOWN_SECONDS = 15;

export const DEFAULT_CONVERSATIONS_PER_PAGE = 25;

export const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return env.AUTH_URL;
};

export const getMarketingSiteUrl = () => {
  if (getBaseUrl() === "https://helperai.dev") {
    return "http://localhost:3011";
  }
  return "https://helper.ai";
};
