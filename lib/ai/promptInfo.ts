export type PromptInfo = {
  systemPrompt: string;
  knowledgeBank: string | null;
  websitePages: { url: string; title: string; similarity: number }[];
  userPrompt: string;
  availableTools: string[];
};
