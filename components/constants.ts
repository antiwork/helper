import { env } from "@/lib/env";

export const EMAIL_UNDO_COUNTDOWN_SECONDS = 60;

export const DEFAULT_CONVERSATIONS_PER_PAGE = 25;

export const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return env.AUTH_URL;
};

export const getMarketingSiteUrl = () => {
  if (getBaseUrl() === env.NEXT_PUBLIC_DEV_HOST) {
    return "http://localhost:3011";
  }
  return "https://helper.ai";
};
