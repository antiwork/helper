"use client";

import { useState } from "react";
import { triggerConfetti } from "@/components/confetti";
import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Button } from "@/components/ui/button";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

const ConfettiSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [confettiEnabled, setConfettiEnabled] = useState(mailbox.preferences?.confetti ?? false);
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast({
        title: "Error updating preferences",
        description: error.message,
      });
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    setConfettiEnabled(checked);
    savingIndicator.setState("saving");
    update({ mailboxSlug: mailbox.slug, preferences: { confetti: checked } });
  };

  const handleTestConfetti = () => {
    triggerConfetti();
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SwitchSectionWrapper
        title="Confetti Settings"
        description="Enable full-page confetti animation when closing a ticket"
        initialSwitchChecked={confettiEnabled}
        onSwitchChange={handleSwitchChange}
        fullWidth
      >
        {confettiEnabled && <Button onClick={handleTestConfetti}>Test Confetti</Button>}
      </SwitchSectionWrapper>
    </div>
  );
};

export default ConfettiSetting;
