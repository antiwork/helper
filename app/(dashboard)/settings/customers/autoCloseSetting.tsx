"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

export default function AutoCloseSetting({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) {
  const [isEnabled, setIsEnabled] = useState(mailbox.autoCloseEnabled);
  const [daysOfInactivity, setDaysOfInactivity] = useState(mailbox.autoCloseDaysOfInactivity?.toString() ?? "30");
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating auto-close settings", {
        description: error.message,
      });
    },
  });

  const save = useDebouncedCallback(() => {
    savingIndicator.setState("saving");
    update({
      autoCloseEnabled: isEnabled,
      autoCloseDaysOfInactivity: Number(daysOfInactivity),
    });
  }, 500);

  useOnChange(() => {
    save();
  }, [isEnabled, daysOfInactivity]);

  const { mutate: runAutoClose, isPending: isAutoClosePending } = api.mailbox.autoClose.useMutation({
    onSuccess: () => {
      toast.success("Auto-close triggered", {
        description: "The auto-close job has been triggered successfully.",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SectionWrapper
        title="Auto-close Inactive Tickets"
        description="Automatically close tickets that have been inactive for a specified period of time."
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-close-toggle">Enable auto-close</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, tickets with no activity will be automatically closed.
              </p>
            </div>
            <Switch id="auto-close-toggle" checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <div className="space-y-2">
              <Label htmlFor="days-of-inactivity">Days of inactivity before auto-close</Label>
              <div className="flex items-center gap-2 w-fit">
                <Input
                  id="days-of-inactivity"
                  type="number"
                  min="1"
                  value={daysOfInactivity}
                  onChange={(e) => setDaysOfInactivity(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{daysOfInactivity === "1" ? "day" : "days"}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tickets with no activity for this many days will be automatically closed.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outlined" onClick={() => runAutoClose()} disabled={!isEnabled || isAutoClosePending}>
              {isAutoClosePending ? "Running..." : "Run auto-close now"}
            </Button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
