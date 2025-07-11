"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SlackChannels } from "../integrations/slackSetting";
import { SwitchSectionWrapper } from "../sectionWrapper";

const CustomerSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [isEnabled, setIsEnabled] = useState(mailbox.vipThreshold !== null);
  const [threshold, setThreshold] = useState(mailbox.vipThreshold?.toString() ?? "100");
  const [responseHours, setResponseHours] = useState(mailbox.vipExpectedResponseHours?.toString() ?? "");
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating VIP settings", {
        description: error.message,
      });
    },
  });

  const save = useDebouncedCallback(() => {
    savingIndicator.setState("saving");
    if (isEnabled) {
      update({
        vipThreshold: Number(threshold),
        vipExpectedResponseHours: responseHours ? Number(responseHours) : null,
      });
    } else {
      update({
        vipThreshold: null,
        vipChannelId: null,
        vipExpectedResponseHours: null,
      });
    }
  }, 500);

  useOnChange(() => {
    save();
  }, [isEnabled, threshold, responseHours]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SwitchSectionWrapper
        title="VIP Customers"
        description="Configure settings for high-value customers"
        initialSwitchChecked={isEnabled}
        onSwitchChange={setIsEnabled}
      >
        {isEnabled && (
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
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
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
                    value={responseHours}
                    onChange={(e) => setResponseHours(e.target.value)}
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
                      onChange={(vipChannelId) => update({ vipChannelId })}
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
      </SwitchSectionWrapper>
    </div>
  );
};

export default CustomerSetting;
