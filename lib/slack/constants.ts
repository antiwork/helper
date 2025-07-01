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
  "links:read",
  "links:write",
  "users:read",
  "users:read.email",
];
export const SLACK_REDIRECT_URI = `${getBaseUrl()}/api/connect/slack/callback`;

export const CLOSED_BY_AGENT_MESSAGE = "Closed by agent";
export const REOPENED_BY_AGENT_MESSAGE = "Reopened by agent";
export const MARKED_AS_SPAM_BY_AGENT_MESSAGE = "Marked as spam by agent";
