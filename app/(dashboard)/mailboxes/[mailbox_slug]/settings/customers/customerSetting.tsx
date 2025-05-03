"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RouterOutputs } from "@/trpc";
import { SlackChannels } from "../integrations/slackSetting";
import SectionWrapper from "../sectionWrapper";

export type CustomerUpdates = {
  vipThreshold?: string | null;
  vipChannelId?: string | null;
  vipExpectedResponseHours?: number | null;
};

type CustomerSettingProps = {
  mailbox: RouterOutputs["mailbox"]["get"];
  onChange: (changes: CustomerUpdates) => void;
};

const CustomerSetting = ({ mailbox, onChange }: CustomerSettingProps) => {
  const [isEnabled, setIsEnabled] = useState(mailbox.vipThreshold !== null);
  const [threshold, setThreshold] = useState(mailbox.vipThreshold?.toString() ?? "100");
  const [responseHours, setResponseHours] = useState(mailbox.vipExpectedResponseHours?.toString() ?? "");

  const updateSettings = (updates: Partial<CustomerUpdates>) => {
    if (!isEnabled) return;
    onChange({
      vipThreshold: threshold,
      vipChannelId: mailbox.vipChannelId,
      vipExpectedResponseHours: responseHours ? Number(responseHours) : null,
      ...updates,
    });
  };

  return (
    <SectionWrapper
      title="VIP Customers"
      description="Configure settings for high-value customers"
      initialSwitchChecked={isEnabled}
      onSwitchChange={(enabled) => {
        setIsEnabled(enabled);
        onChange(
          enabled
            ? {
                vipThreshold: threshold,
                vipChannelId: null,
                vipExpectedResponseHours: responseHours ? Number(responseHours) : null,
              }
            : {
                vipThreshold: null,
                vipChannelId: null,
                vipExpectedResponseHours: null,
              },
        );
      }}
    >
      {isEnabled && (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="max-w-2xl">
              <Label htmlFor="vipThreshold" className="text-base font-medium">
                Customer Value Threshold
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Customers with a value above this threshold will be marked as VIP
              </p>
              <Input
                id="vipThreshold"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter threshold value"
                value={threshold}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setThreshold(newValue);
                  updateSettings({ vipThreshold: newValue || "0" });
                }}
                className="mt-2 max-w-sm"
              />
            </div>

            <div className="max-w-2xl">
              <Label htmlFor="responseHours" className="text-base font-medium">
                Response Time Target
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Set a target response time for VIP customers. You'll be alerted if responses exceed this timeframe.
              </p>
              <div className="mt-2 flex items-center gap-2 w-36">
                <Input
                  id="responseHours"
                  type="number"
                  min="1"
                  step="1"
                  value={responseHours}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setResponseHours(newValue);
                    updateSettings({ vipExpectedResponseHours: Number(newValue) || null });
                  }}
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
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a Slack channel to receive notifications about VIP customer messages
              </p>
              <div className="mt-4">
                {mailbox.slackConnected ? (
                  <SlackChannels
                    id="vipChannel"
                    selectedChannelId={mailbox.vipChannelId ?? undefined}
                    mailbox={mailbox}
                    onChange={(changes) => updateSettings({ vipChannelId: changes.alertChannel })}
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
      )}
    </SectionWrapper>
  );
};

export default CustomerSetting;
