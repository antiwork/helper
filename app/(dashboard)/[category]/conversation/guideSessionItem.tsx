"use client";

import { ChevronDown, ChevronRight, Hand } from "lucide-react";
import { useState } from "react";
import type { GuideSession as GuideSessionType } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { Checkbox } from "@/components/ui/checkbox";

export const GuideSessionItem = ({ guideSession }: { guideSession: GuideSessionType }) => {
  const [showInstructions, setShowInstructions] = useState(false);
  return (
    <div
      data-message-item
      data-type="guide-session"
      data-id={guideSession.id}
      className="responsive-break-words grid"
      data-testid="guide-session-item"
    >
      <div className="flex">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hand className="h-3 w-3" />
              Helping hand
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="inline-block rounded-lg p-4 border md:bg-muted md:border-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowInstructions((v) => !v)}
                    aria-label="Toggle instructions"
                  >
                    {showInstructions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium text-foreground">{guideSession.title}</span>
                  </button>
                </div>

                {showInstructions && guideSession.instructions && (
                  <div className="mb-3 text-sm text-muted-foreground border rounded p-3 whitespace-pre-wrap">
                    {guideSession.instructions}
                  </div>
                )}

                {guideSession.steps && guideSession.steps.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {guideSession.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Checkbox checked={step.completed} disabled aria-label={`Step ${idx + 1}`} />
                        <span className="text-sm text-foreground">{step.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="flex w-full items-center gap-3 text-sm text-muted-foreground">
            <div className="flex flex-1 items-center gap-2">
              <HumanizedTime time={guideSession.createdAt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideSessionItem;
