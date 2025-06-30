"use client";

import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../../sectionWrapper";

interface AutoRespondSettingsProps {
  mailbox: RouterOutputs["mailbox"]["get"];
  autoRespond: "off" | "draft" | "reply";
  onAutoRespondChange: (value: "off" | "draft" | "reply") => void;
}

export function AutoRespondSettings({ mailbox, autoRespond, onAutoRespondChange }: AutoRespondSettingsProps) {
  const emailResponseSaving = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: updateEmailResponse } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
      emailResponseSaving.setState("saved");
    },
    onError: (error) => {
      emailResponseSaving.setState("error");
      toast({
        title: "Error updating email response settings",
        description: error.message,
      });
    },
  });

  const saveEmailResponse = useDebouncedCallback(() => {
    emailResponseSaving.setState("saving");
    updateEmailResponse({
      mailboxSlug: mailbox.slug,
      preferences: {
        autoRespondEmailToChat: autoRespond === "off" ? null : autoRespond,
      },
    });
  }, 500);

  useOnChange(() => {
    saveEmailResponse();
  }, [autoRespond]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={emailResponseSaving.state} />
      </div>
      <SectionWrapper
        title="Respond to email inquiries with chat"
        description="Automatically respond to emails as if the customer was using the chat widget."
      >
        <div className="space-y-4">
          <Tabs value={autoRespond} onValueChange={(value) => onAutoRespondChange(value as "off" | "draft" | "reply")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="off">Off</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="reply">Reply</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </SectionWrapper>
    </div>
  );
}