export type Step = {
  description: string;
  completed: boolean;
};

export type GuideInstructions = {
  instructions: string;
  title: string | null;
  callId: string | null;
  resumed: boolean;
  steps: Step[];
};
