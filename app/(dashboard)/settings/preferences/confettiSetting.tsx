"use client";

import { useState } from "react";
import { toast } from "sonner";
import { triggerConfetti } from "@/components/confetti";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/useSession";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

const ConfettiSetting = () => {
  const { user } = useSession() ?? {};
  const [confettiEnabled, setConfettiEnabled] = useState(user?.preferences?.confetti ?? false);
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();
  const { mutate: update } = api.user.update.useMutation({
    onSuccess: () => {
      utils.user.currentUser.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating preferences", { description: error.message });
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    setConfettiEnabled(checked);
    savingIndicator.setState("saving");
    update({
      preferences: {
        confetti: checked,
      },
    });
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
      >
        {confettiEnabled && <Button onClick={handleTestConfetti}>Test Confetti</Button>}
      </SwitchSectionWrapper>
    </div>
  );
};

export default ConfettiSetting;
