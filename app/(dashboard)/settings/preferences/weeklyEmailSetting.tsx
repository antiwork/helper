"use client";

import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { useSession } from "@/components/useSession";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

const WeeklyEmailSetting = () => {
  const { user } = useSession() ?? {};
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
    savingIndicator.setState("saving");
    update({ preferences: { allowWeeklyEmail: checked } });
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SwitchSectionWrapper
        title="Weekly Email Reports"
        description="Receive a weekly summary email with trends and aggregate metrics"
        initialSwitchChecked={user?.preferences?.allowWeeklyEmail !== false}
        onSwitchChange={handleSwitchChange}
      >
        <></>
      </SwitchSectionWrapper>
    </div>
  );
};

export default WeeklyEmailSetting;
