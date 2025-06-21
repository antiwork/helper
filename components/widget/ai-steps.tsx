"use client";

import { Check, Loader2 } from "lucide-react";

type StepStatus = "completed" | "loading" | "pending";

interface Step {
  id: string;
  description: string;
  completed: boolean;
  details?: {
    function?: string;
    params?: Record<string, any>;
    result?: any;
  };
}

interface AIStepsProps {
  steps: Step[];
  isDone: boolean;
}

export function AISteps({ steps, isDone }: AIStepsProps) {
  const currentStepIndex = steps.findIndex((step) => !step.completed);

  return (
    <div className="flex flex-col space-y-4 w-full max-w-2xl">
      {steps.map((step, index) => {
        let status: StepStatus = "pending";
        if (step.completed || isDone) {
          status = "completed";
        } else if (index === currentStepIndex) {
          status = "loading";
        }

        return (
          <div key={step.id} className="flex items-center space-x-3">
            <StatusIcon status={status} index={index + 1} />
            <p className="text-sm">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "completed") {
    return (
      <div className="rounded-full bg-black text-white flex items-center justify-center w-6 h-6">
        <Check className="h-4 w-4" />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-full bg-pink-100 text-pink-500 flex items-center justify-center w-6 h-6">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-full border border-gray-300 text-gray-500 flex items-center justify-center w-6 h-6 text-xs">
      {index}
    </div>
  );
}
