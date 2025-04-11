import type { MessageRole } from "@/db/schema/conversationMessages";

export type AIRole = "assistant" | "user" | "tool";

export const HELPER_TO_AI_ROLES_MAPPING: Record<MessageRole, AIRole> = {
  user: "user",
  staff: "assistant",
  ai_assistant: "assistant",
  tool: "tool",
};

export const REQUEST_HUMAN_SUPPORT_DESCRIPTION = `escalate the conversation to a human agent, when can't help the user or the user asks to talk to a human. Only use this tool *after* the user has provided a description of their issue, otherwise do not use the tool and clarify the issue first. Only use this tool if you are sure that the user is asking to talk to a human.
If the user doesnt provide a description of their issue, ask follow up questions as bullet points to clarify the issue related to the product and the chat history. Ex.: "Is it a technical issue? Are you having trouble logging in? etc."`;
