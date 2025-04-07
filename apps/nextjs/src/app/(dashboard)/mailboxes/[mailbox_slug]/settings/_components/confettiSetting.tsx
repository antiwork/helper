"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SectionWrapper from "./sectionWrapper";

type ConfettiEvent = "reply" | "close";

export type ConfettiUpdates =
  | {
      confetti: boolean;
      confettiEvents: ConfettiEvent[];
      confettiIntensity: "low" | "medium" | "high";
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
  const [confettiEvents, setConfettiEvents] = useState<ConfettiEvent[]>(confettiData?.confettiEvents ?? []);
  const [confettiIntensity, setConfettiIntensity] = useState<"low" | "medium" | "high">(
    confettiData?.confettiIntensity ?? "medium",
  );

  const handleChange = (updates: Partial<ConfettiUpdates>) => {
    const newState = {
      confetti: updates?.confetti ?? confettiEnabled,
      confettiEvents: updates?.confettiEvents ?? confettiEvents,
      confettiIntensity: updates?.confettiIntensity ?? confettiIntensity,
    };

    setConfettiEnabled(newState.confetti);
    setConfettiEvents(newState.confettiEvents);
    setConfettiIntensity(newState.confettiIntensity);

    onChange(newState);
  };

  const handleSwitchChange = (checked: boolean) => {
    handleChange({ confetti: checked });
  };

  const handleEventChange = (value: ConfettiEvent) => {
    const newEvents = confettiEvents.includes(value)
      ? confettiEvents.filter((event) => event !== value)
      : [...confettiEvents, value];

    handleChange({ confettiEvents: newEvents });
  };

  const handleIntensityChange = (value: "low" | "medium" | "high") => {
    handleChange({ confettiIntensity: value });
  };

  return (
    <SectionWrapper
      title="Confetti Settings"
      description="Enable celebratory confetti animations for ticket actions"
      initialSwitchChecked={confettiData?.confetti ?? false}
      onSwitchChange={handleSwitchChange}
    >
      {confettiEnabled && (
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label>Confetti Events</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch checked={confettiEvents.includes("reply")} onCheckedChange={() => handleEventChange("reply")} />
                <Label>When replying to a ticket</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={confettiEvents.includes("close")} onCheckedChange={() => handleEventChange("close")} />
                <Label>When closing a ticket</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Confetti Intensity</Label>
            <Select value={confettiIntensity} onValueChange={handleIntensityChange}>
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder="Select confetti intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Minimal animation)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Maximum celebration)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose a lower intensity if you have users with motion sensitivity
            </p>
          </div>
        </div>
      )}
    </SectionWrapper>
  );
};

export default ConfettiSetting;
