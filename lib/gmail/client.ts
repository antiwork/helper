import { google } from "googleapis";
import { getBaseUrl } from "@/components/constants";
import { gmailSupportEmails } from "@/db/schema";
import { env } from "@/lib/env";

export const getGmailService = (
  gmailSupportEmail: Pick<typeof gmailSupportEmails.$inferSelect, "accessToken" | "refreshToken">,
) => {
  const auth = new google.auth.OAuth2({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${getBaseUrl()}/api/connect/google/callback`,
    forceRefreshOnFailure: true,
  });
  auth.setCredentials({
    access_token: gmailSupportEmail.accessToken,
    refresh_token: gmailSupportEmail.refreshToken,
  });
  return google.gmail({ version: "v1", auth });
};

export type GmailClient = Awaited<ReturnType<typeof getGmailService>>;

export const getMessageById = async (client: GmailClient, messageId: string) => {
  const response = await client.users.messages.get({
    userId: "me",
    id: messageId,
    format: "raw",
  });
  return response;
};

export const getMessageMetadataById = async (client: GmailClient, messageId: string) => {
  const response = await client.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
  });
  return response;
};

export const getMessagesFromHistoryId = async (client: GmailClient, historyId: string) => {
  const response = await client.users.history.list({
    userId: "me",
    startHistoryId: historyId,
  });
  return response;
};

export const subscribeToMailbox = async (client: GmailClient) => {
  return await client.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: env.GOOGLE_PUBSUB_TOPIC_NAME,
    },
  });
};

export const sendGmailEmail = async (client: GmailClient, raw: string, threadId: string | null) => {
  return await client.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId,
    },
  });
};

export const getLast10GmailThreads = async (client: GmailClient) => {
  const threads = await client.users.threads.list({
    userId: "me",
    maxResults: 10,
    labelIds: ["INBOX"],
    includeSpamTrash: false,
  });
  return threads;
};

export const listGmailThreads = async (
  client: GmailClient,
  options: {
    maxResults?: number;
    labelIds?: string[];
    includeSpamTrash?: boolean;
    q?: string;
  },
) => {
  const threads = await client.users.threads.list({
    userId: "me",
    includeSpamTrash: false,
    ...options,
  });
  return threads;
};

export const getThread = async (client: GmailClient, threadId: string) => {
  const thread = await client.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
  });
  return thread;
};
