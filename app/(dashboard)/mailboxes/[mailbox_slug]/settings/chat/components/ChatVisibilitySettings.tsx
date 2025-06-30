"use client";

import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { mailboxes } from "@/db/schema";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { toast } from "@/components/hooks/use-toast";
import { SwitchSectionWrapper } from "../../sectionWrapper";

type WidgetMode = (typeof mailboxes.$inferSelect)["widgetDisplayMode"];

interface ChatVisibilitySettingsProps {
  mailbox: RouterOutputs["mailbox"]["get"];
  mode: WidgetMode;
  minValue: string;
  onModeChange: (mode: WidgetMode) => void;
  onMinValueChange: (value: string) => void;
}

export function ChatVisibilitySettings({
  mailbox,
  mode,
  minValue,
  onModeChange,
  onMinValueChange,
}: ChatVisibilitySettingsProps) {
  const chatVisibilitySaving = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: updateChatVisibility } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
      chatVisibilitySaving.setState("saved");
    },
    onError: (error) => {
      chatVisibilitySaving.setState("error");
      toast({
        title: "Error updating chat visibility settings",
        description: error.message,
      });
    },
  });

  const saveChatVisibility = useDebouncedCallback(() => {
    chatVisibilitySaving.setState("saving");
    updateChatVisibility({
      mailboxSlug: mailbox.slug,
      widgetDisplayMode: mode,
      widgetDisplayMinValue: mode === "revenue_based" && /^\d+$/.test(minValue) ? Number(minValue) : null,
    });
  }, 500);

  useOnChange(() => {
    saveChatVisibility();
  }, [mode, minValue]);

  const handleSwitchChange = (checked: boolean) => {
    const newMode = checked ? "always" : "off";
    onModeChange(newMode);
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={chatVisibilitySaving.state} />
      </div>
      <SwitchSectionWrapper
        title="Chat Icon Visibility"
        description="Choose when your customers can see the chat widget on your website or app"
        initialSwitchChecked={mode !== "off"}
        onSwitchChange={handleSwitchChange}
      >
        {mode !== "off" && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Show chat icon for</Label>
              <Select value={mode} onValueChange={(mode) => onModeChange(mode as WidgetMode)}>
                <SelectTrigger className="w-[350px]">
                  <SelectValue placeholder="Select when to show chat icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">All customers</SelectItem>
                  <SelectItem value="revenue_based">Customers with value greater than</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "revenue_based" && (
              <div className="flex items-center space-x-4">
                <Input
                  id="min-value"
                  type="number"
                  value={minValue}
                  onChange={(e) => onMinValueChange(e.target.value)}
                  className="max-w-[200px]"
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>
        )}
      </SwitchSectionWrapper>
    </div>
  );
}