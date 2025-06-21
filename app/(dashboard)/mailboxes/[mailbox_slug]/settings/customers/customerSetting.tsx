"use client";

import { useEffect } from "react";
import { useManualSave } from "@/components/hooks/useManualSave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveableForm } from "@/components/ui/saveableForm";
import { Separator } from "@/components/ui/separator";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SlackChannels } from "../integrations/slackSetting";
import { SwitchSectionWrapper } from "../sectionWrapper";

export type CustomerUpdates = {
  vipThreshold?: string | null;
  vipChannelId?: string | null;
  vipExpectedResponseHours?: number | null;
};

const CustomerSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation();

  const { currentData, isDirty, isLoading, updateData, handleSave, handleCancel, handleReset } = useManualSave(
    {
      isEnabled: mailbox.vipThreshold !== null,
      threshold: mailbox.vipThreshold?.toString() ?? "100",
      responseHours: mailbox.vipExpectedResponseHours?.toString() ?? "",
    },
    {
      onSave: async (data) => {
        await new Promise<void>((resolve, reject) => {
          if (data.isEnabled) {
            update(
              {
                mailboxSlug: mailbox.slug,
                vipThreshold: Number(data.threshold),
                vipExpectedResponseHours: data.responseHours ? Number(data.responseHours) : null,
              },
              {
                onSuccess: () => {
                  utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
                  resolve();
                },
                onError: reject,
              },
            );
          } else {
            update(
              {
                mailboxSlug: mailbox.slug,
                vipThreshold: null,
                vipChannelId: null,
                vipExpectedResponseHours: null,
              },
              {
                onSuccess: () => {
                  utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
                  resolve();
                },
                onError: reject,
              },
            );
          }
        });
      },
      successMessage: "VIP customer settings updated successfully",
      errorMessage: "Failed to update VIP customer settings",
    },
  );

  useEffect(() => {
    handleReset({
      isEnabled: mailbox.vipThreshold !== null,
      threshold: mailbox.vipThreshold?.toString() ?? "100",
      responseHours: mailbox.vipExpectedResponseHours?.toString() ?? "",
    });
  }, [mailbox.vipThreshold, mailbox.vipExpectedResponseHours, handleReset]);

  return (
    <SwitchSectionWrapper
      title="VIP Customers"
      description="Configure settings for high-value customers"
      initialSwitchChecked={currentData.isEnabled}
      onSwitchChange={(enabled) => updateData({ isEnabled: enabled })}
    >
      {currentData.isEnabled && (
        <SaveableForm isDirty={isDirty} isLoading={isLoading} onSave={handleSave} onCancel={handleCancel}>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="max-w-2xl">
                <Label htmlFor="vipThreshold" className="text-base font-medium">
                  Customer Value Threshold
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  Customers with a value above this threshold will be marked as VIP
                </p>
                <Input
                  id="vipThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter threshold value"
                  value={currentData.threshold}
                  onChange={(e) => updateData({ threshold: e.target.value })}
                  className="mt-2 max-w-sm"
                />
              </div>

              <div className="max-w-2xl">
                <Label htmlFor="responseHours" className="text-base font-medium">
                  Response Time Target
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set a target response time for VIP customers. You'll be alerted if responses exceed this timeframe.
                </p>
                <div className="mt-2 flex items-center gap-2 w-36">
                  <Input
                    id="responseHours"
                    type="number"
                    min="1"
                    step="1"
                    value={currentData.responseHours}
                    onChange={(e) => updateData({ responseHours: e.target.value })}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">hours</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="max-w-2xl">
                <Label htmlFor="vipChannel" className="text-base font-medium">
                  Slack Notifications
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a Slack channel to receive notifications about VIP customer messages
                </p>
                <div className="mt-4">
                  {mailbox.slackConnected ? (
                    <SlackChannels
                      id="vipChannel"
                      selectedChannelId={mailbox.vipChannelId ?? undefined}
                      mailbox={mailbox}
                      onChange={(vipChannelId) => update({ mailboxSlug: mailbox.slug, vipChannelId })}
                    />
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Slack integration is required for VIP channel notifications. Please configure Slack in the
                        Integrations tab.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SaveableForm>
      )}
    </SwitchSectionWrapper>
  );
};

export default CustomerSetting;
