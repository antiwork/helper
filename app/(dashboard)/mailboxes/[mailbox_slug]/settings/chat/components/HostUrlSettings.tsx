"use client";

import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../../sectionWrapper";

interface HostUrlSettingsProps {
  mailbox: RouterOutputs["mailbox"]["get"];
  widgetHost: string;
  onWidgetHostChange: (value: string) => void;
}

export function HostUrlSettings({ mailbox, widgetHost, onWidgetHostChange }: HostUrlSettingsProps) {
  const hostUrlSaving = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: updateHostUrl } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
      hostUrlSaving.setState("saved");
    },
    onError: (error) => {
      hostUrlSaving.setState("error");
      toast({
        title: "Error updating host URL",
        description: error.message,
      });
    },
  });

  const saveHostUrl = useDebouncedCallback(() => {
    hostUrlSaving.setState("saving");
    updateHostUrl({
      mailboxSlug: mailbox.slug,
      widgetHost: widgetHost || null,
    });
  }, 500);

  useOnChange(() => {
    saveHostUrl();
  }, [widgetHost]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={hostUrlSaving.state} />
      </div>
      <SectionWrapper
        title="Chat widget host URL"
        description="The URL where your chat widget is installed. If set, customers will be able to continue email conversations in the chat widget."
      >
        <div className="flex flex-col space-y-2">
          <Label htmlFor="widgetHost">Host URL</Label>
          <Input
            id="widgetHost"
            type="url"
            value={widgetHost}
            onChange={(e) => onWidgetHostChange(e.target.value)}
            placeholder="https://example.com"
            className="max-w-[350px]"
          />
        </div>
      </SectionWrapper>
    </div>
  );
}