"use client";

import { useState } from "react";
import { triggerConfetti } from "@/components/confetti";
import { Button } from "@/components/ui/button";
import SectionWrapper from "./sectionWrapper";

type ConfettiEvent = "reply" | "close";

export type ConfettiUpdates =
  | {
      confetti: boolean;
    }
  | undefined
  | null;

const ConfettiSetting = ({
  confettiData,
  onChange,
}: {
  confettiData: ConfettiUpdates;
  onChange: (updates: ConfettiUpdates) => void;
}) => {
  const [confettiEnabled, setConfettiEnabled] = useState(confettiData?.confetti ?? false);

  const handleChange = (updates: Partial<ConfettiUpdates>) => {
    const newState = {
      confetti: updates?.confetti ?? confettiEnabled,
    };
    setConfettiEnabled(newState.confetti);
    onChange(newState);
  };

  const handleSwitchChange = (checked: boolean) => {
    handleChange({ confetti: checked });
  };

  const handleTestConfetti = () => {
    triggerConfetti();
  };

  return (
    <SectionWrapper
      title="Confetti Settings"
      description="Enable full-page confetti animation when closing a ticket"
      initialSwitchChecked={confettiData?.confetti ?? false}
      onSwitchChange={handleSwitchChange}
    >
      {confettiEnabled && <Button onClick={handleTestConfetti}>Test Confetti</Button>}
    </SectionWrapper>
  );
};

export default ConfettiSetting;
