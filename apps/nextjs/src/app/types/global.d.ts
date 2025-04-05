import { RouterOutputs } from "@/trpc";

export type MetadataEndpoint = {
  url: string;
  hmacSecret: string;
};

export type PromptLineUpdate = {
  lineIndex?: number;
  content?: string;
};

export type FAQ = RouterOutputs["mailbox"]["faqs"]["list"][number];

type Draft = {
  id: number;
  responseToId: number;
  body: string;
  isFlaggedAsBad: boolean;
  isStale: boolean;
};

export type PreviousConversation = {
  slug: string;
  subject: string;
  createdAt: string;
};

export type Conversation = RouterOutputs["mailbox"]["conversations"]["get"];
export type Message = Extract<Conversation["messages"][number], { type: "message" }>;
export type Note = Extract<Conversation["messages"][number], { type: "note" }>;
export type ConversationEvent = Extract<Conversation["messages"][number], { type: "event" }>;

export type AttachedFile = Message["files"][number];

export type ConversationListItem = RouterOutputs["mailbox"]["conversations"]["list"]["conversations"][number] & {
  assignedToAI?: boolean;
};

export type Pagination = {
  next_page: number | null;
  previous_page: number | null;
  page_number: number;
  total_pages: number;
};

export type SupportAccount = {
  id: number;
  email: string;
};

export type Subscription = {
  stripeSubscriptionId: string | null;
  status: string | null;
  canceledAt: Date | null;
};
