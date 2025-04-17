import { getBaseUrl } from "@/components/constants";

export const REQUIRED_SCOPES = [
  "app_mentions:read",
  "assistant:write",
  "channels:history",
  "channels:join",
  "channels:read",
  "chat:write",
  "im:history",
  "im:read",
  "im:write",
  "users:read",
  "users:read.email",
];
export const SLACK_REDIRECT_URI = `${getBaseUrl()}/api/connect/slack/callback`;
