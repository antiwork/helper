import { SQL } from "drizzle-orm";
import { conversations } from "@/db/schema";

export type AgentAction = "search_tickets" | "get_stats" | "close_tickets" | "reply_to_tickets" | "unknown";

export type IntentParameters = Record<string, any>;

export interface IntentResponse {
  text: string;
  blocks?: any[];
}

export interface MailboxCheckResult {
  requiresMailbox: boolean;
  mailboxes: any[];
  mailboxNames: string;
  specifiedMailbox: any;
  text: string;
  blocks?: any[];
}

export type Ticket = typeof conversations.$inferSelect;
