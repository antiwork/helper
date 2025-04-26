export type Step = {
  description: string;
  completed: boolean;
};

export type GuideInstructions = {
  sessionId: string;
  instructions: string;
  title: string | null;
  steps: Step[];
};
