"use client";

import { useEffect } from "react";
import { toast } from "@/components/hooks/use-toast";
import { useManualSave } from "@/components/hooks/useManualSave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveableForm } from "@/components/ui/saveableForm";
import { Switch } from "@/components/ui/switch";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

export type AutoCloseUpdates = {
  autoCloseEnabled: boolean;
  autoCloseDaysOfInactivity: number;
};

export default function AutoCloseSetting({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) {
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation();

  const { currentData, isDirty, isLoading, updateData, handleSave, handleCancel, handleReset } = useManualSave(
    {
      isEnabled: mailbox.autoCloseEnabled,
      daysOfInactivity: mailbox.autoCloseDaysOfInactivity?.toString() ?? "30",
    },
    {
      onSave: async (data) => {
        await new Promise<void>((resolve, reject) => {
          update(
            {
              mailboxSlug: mailbox.slug,
              autoCloseEnabled: data.isEnabled,
              autoCloseDaysOfInactivity: Number(data.daysOfInactivity),
            },
            {
              onSuccess: () => {
                utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
                resolve();
              },
              onError: reject,
            },
          );
        });
      },
      successMessage: "Auto-close settings updated successfully",
      errorMessage: "Failed to update auto-close settings",
    },
  );

  useEffect(() => {
    handleReset({
      isEnabled: mailbox.autoCloseEnabled,
      daysOfInactivity: mailbox.autoCloseDaysOfInactivity?.toString() ?? "30",
    });
  }, [mailbox.autoCloseEnabled, mailbox.autoCloseDaysOfInactivity, handleReset]);

  const { mutate: runAutoClose, isPending: isAutoClosePending } = api.mailbox.autoClose.useMutation({
    onSuccess: () => {
      toast({
        title: "Auto-close triggered",
        description: "The auto-close job has been triggered successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <SectionWrapper
      title="Auto-close Inactive Tickets"
      description="Automatically close tickets that have been inactive for a specified period of time."
    >
      <SaveableForm isDirty={isDirty} isLoading={isLoading} onSave={handleSave} onCancel={handleCancel}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-close-toggle">Enable auto-close</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, tickets with no activity will be automatically closed.
              </p>
            </div>
            <Switch
              id="auto-close-toggle"
              checked={currentData.isEnabled}
              onCheckedChange={(enabled) => updateData({ isEnabled: enabled })}
            />
          </div>

          {currentData.isEnabled && (
            <div className="space-y-2">
              <Label htmlFor="days-of-inactivity">Days of inactivity before auto-close</Label>
              <div className="flex items-center gap-2 w-fit">
                <Input
                  id="days-of-inactivity"
                  type="number"
                  min="1"
                  value={currentData.daysOfInactivity}
                  onChange={(e) => updateData({ daysOfInactivity: e.target.value })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {currentData.daysOfInactivity === "1" ? "day" : "days"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tickets with no activity for this many days will be automatically closed.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outlined"
              onClick={() => runAutoClose({ mailboxSlug: mailbox.slug })}
              disabled={!currentData.isEnabled || isAutoClosePending}
            >
              {isAutoClosePending ? "Running..." : "Run auto-close now"}
            </Button>
          </div>
        </div>
      </SaveableForm>
    </SectionWrapper>
  );
}
