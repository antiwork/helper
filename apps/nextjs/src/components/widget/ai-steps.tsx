"use client";

import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export type StepStatus = "completed" | "loading" | "pending";

export interface Step {
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
  onToggleStep?: (stepId: string) => void;
}

export function AISteps({ steps, onToggleStep }: AIStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));

    if (onToggleStep) {
      onToggleStep(stepId);
    }
  };

  return (
    <div className="flex flex-col space-y-2 w-full max-w-2xl">
      {steps.map((step) => (
        <Card key={step.id} className="bg-black border-zinc-800 text-white p-3 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-normal">{step.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <StatusIcon status={step.completed ? "completed" : true ? "loading" : "pending"} />
              <button onClick={() => toggleStep(step.id)} className="text-zinc-400 hover:text-white transition-colors">
                {expandedSteps[step.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {expandedSteps[step.id] && step.details && (
            <div className="mt-2">
              <div className="flex items-start text-zinc-400 mb-0.5">
                <span className="mr-2 font-mono text-xs">→</span>
                {step.details.function && (
                  <code className="font-mono text-xs">
                    {step.details.function}({step.details.params && JSON.stringify(step.details.params)})
                  </code>
                )}
              </div>
              {step.details.result && (
                <pre className="font-mono text-xs text-zinc-400 overflow-x-auto mt-0.5">
                  {typeof step.details.result === "object" ? JSON.stringify(step.details.result) : step.details.result}
                </pre>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return (
      <div className="rounded-full">
        <Check className="h-4 w-4 text-green-500" />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div>
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      </div>
    );
  }

  return null;
}
