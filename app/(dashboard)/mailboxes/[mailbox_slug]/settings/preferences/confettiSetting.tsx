"use client";

import { useState } from "react";
import { triggerConfetti } from "@/components/confetti";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const ConfettiSetting = ({
  mailbox,
  preferences,
}: {
  mailbox: RouterOutputs["mailbox"]["get"];
  preferences: RouterOutputs["mailbox"]["preferences"]["get"];
}) => {
  const [confettiEnabled, setConfettiEnabled] = useState(preferences.preferences?.confetti ?? false);
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.preferences.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
    },
    onError: (error) => {
      toast({
        title: "Error updating preferences",
        description: error.message,
      });
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    setConfettiEnabled(checked);
    update({ mailboxSlug: mailbox.slug, preferences: { confetti: confettiEnabled } });
  };

  const handleTestConfetti = () => {
    triggerConfetti();
  };

  return (
    <SectionWrapper
      title="Confetti Settings"
      description="Enable full-page confetti animation when closing a ticket"
      initialSwitchChecked={confettiEnabled}
      onSwitchChange={handleSwitchChange}
    >
      {confettiEnabled && <Button onClick={handleTestConfetti}>Test Confetti</Button>}
    </SectionWrapper>
  );
};

export default ConfettiSetting;
