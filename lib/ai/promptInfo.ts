export type PromptInfo = {
  systemPrompt: string;
  knowledgeBank: string | null;
  websitePagesPrompt: string | null;
  userPrompt: string;
  availableTools: string[];
};
