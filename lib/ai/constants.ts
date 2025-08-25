import type { MessageRole } from "@/db/schema/conversationMessages";

type AIRole = "assistant" | "user" | "tool";

export const HELPER_TO_AI_ROLES_MAPPING: Record<MessageRole, AIRole> = {
  user: "user",
  staff: "assistant",
  ai_assistant: "assistant",
  tool: "tool",
};

export const REQUEST_HUMAN_SUPPORT_DESCRIPTION = `escalate the conversation to a human agent, when can't help the user or the user asks to talk to a human. Only use this tool *after* the user has provided a description of their issue, otherwise do not use the tool and clarify the issue first. Only use this tool if you are sure that the user is asking to talk to a human.
If the user doesnt provide a description of their issue, ask follow up questions as bullet points to clarify the issue related to the product and the chat history. Ex.: "Is it a technical issue? Are you having trouble logging in? etc."`;

export const GUIDE_USER_TOOL_NAME = "guide_user";

export const GUIDE_INITIAL_PROMPT = `
Your ultimate task is: """INSTRUCTIONS""". 
If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.
    
Current URL: {{CURRENT_URL}}
Current Page Title: {{CURRENT_PAGE_TITLE}}
Current Elements: {{PAGE_DETAILS}}`;

export const MOCKED_COMMON_ISSUES_SUGGESTIONS = [
  {
    title: "Outdated/Irrelevant Suggestions",
    description: "Reports that AI code suggestions recommend deprecated APIs, incorrect patterns, or irrelevant code.",
    reasoning:
      "Suggestion quality directly impacts trust and productivity; issues like deprecated APIs are likely to recur across languages and versions.",
  },
  {
    title: "Autocomplete Intrusiveness",
    description:
      "Complaints that auto-completion triggers too often, completes prematurely, or interrupts typing flow.",
    reasoning:
      "Overly aggressive behavior is a common friction point with AI assistants and tends to generate repeated requests to tune sensitivity.",
  },
  {
    title: "Suggestion UI Obstruction",
    description: "Feedback that popup suggestion panels obscure existing code or important context in the editor.",
    reasoning:
      "In-IDE overlays frequently cause visibility and focus issues, making this a typical UI/UX support pattern.",
  },
  {
    title: "Granular Configuration Controls",
    description:
      "Requests for finer controls over when/how suggestions appear (per-language, per-file, trigger conditions, enable/disable).",
    reasoning:
      "Users have varied workflows and need customization; gaps in settings commonly lead to support tickets and feature requests.",
  },
  {
    title: "Private Codebase Training",
    description:
      "Inquiries about training/adapting the assistant on an organization's repositories and internal APIs/patterns.",
    reasoning:
      "Enterprise and team customers often seek model customization to improve relevance and maintain internal standards, making this a recurring theme.",
  },
];
