import type { UnsavedFileInfo } from "@/components/fileUploadContext";
import { RouterOutputs } from "@/trpc";

export type MetadataEndpoint = {
  url: string;
  hmacSecret: string;
};

export type FAQ = RouterOutputs["mailbox"]["faqs"]["list"][number];

export type DraftedEmail = {
  cc: string;
  bcc: string;
  message: string;
  files: UnsavedFileInfo[];
};

export type Conversation = RouterOutputs["mailbox"]["conversations"]["get"];
export type Message = Extract<Conversation["messages"][number], { type: "message" }>;
export type Note = Extract<Conversation["messages"][number], { type: "note" }>;
export type ConversationEvent = Extract<Conversation["messages"][number], { type: "event" }>;
export type GuideSession = Extract<Conversation["messages"][number], { type: "guide_session" }>;

export type AttachedFile = Message["files"][number];

export type ConversationListItem = RouterOutputs["mailbox"]["conversations"]["list"]["conversations"][number] & {
  assignedToAI?: boolean;
};
