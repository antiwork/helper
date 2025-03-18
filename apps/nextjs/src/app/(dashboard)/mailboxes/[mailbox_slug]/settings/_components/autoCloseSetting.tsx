"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RouterOutputs } from "@/trpc";
import SectionWrapper from "./sectionWrapper";

export type AutoCloseUpdates = {
  autoCloseEnabled: boolean;
  autoCloseDaysOfInactivity: number;
};

type AutoCloseSettingProps = {
  mailbox: RouterOutputs["mailbox"]["get"];
  onUpdate: (updates: AutoCloseUpdates) => Promise<void>;
};

export default function AutoCloseSetting({ mailbox, onUpdate }: AutoCloseSettingProps) {
  const [isEnabled, setIsEnabled] = useState(mailbox.autoCloseEnabled || false);
  const [daysOfInactivity, setDaysOfInactivity] = useState(mailbox.autoCloseDaysOfInactivity || 14);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setDaysOfInactivity(value);
    }
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        autoCloseEnabled: isEnabled,
        autoCloseDaysOfInactivity: daysOfInactivity,
      });
      toast({
        title: "Settings updated",
        description: "Auto-close settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error updating settings",
        description: "There was an error updating the auto-close settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const runAutoCloseNow = async () => {
    setIsRunningNow(true);
    try {
      const response = await fetch("/api/auto-close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mailboxId: mailbox.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to trigger auto-close");
      }

      toast({
        title: "Auto-close triggered",
        description: "The auto-close job has been triggered successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to trigger auto-close",
        variant: "destructive",
      });
    } finally {
      setIsRunningNow(false);
    }
  };

  return (
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
          <Switch id="auto-close-toggle" checked={isEnabled} onCheckedChange={handleToggle} />
        </div>

        {isEnabled && (
          <div className="space-y-2">
            <Label htmlFor="days-of-inactivity">Days of inactivity before auto-close</Label>
            <div className="flex items-center gap-2">
              <Input
                id="days-of-inactivity"
                type="number"
                min="1"
                value={daysOfInactivity}
                onChange={handleDaysChange}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tickets with no activity for this many days will be automatically closed.
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outlined" onClick={runAutoCloseNow} disabled={!isEnabled || isRunningNow}>
            {isRunningNow ? "Running..." : "Run auto-close now"}
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
