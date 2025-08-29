"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { useSession } from "@/components/useSession";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

const NextTicketPreviewSetting = () => {
  const { user } = useSession() ?? {};
  const [nextTicketPreviewEnabled, setNextTicketPreviewEnabled] = useState(
    !user?.preferences?.disableNextTicketPreview,
  );
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
    setNextTicketPreviewEnabled(checked);
    savingIndicator.setState("saving");
    update({
      preferences: {
        disableNextTicketPreview: !checked,
      },
    });
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SwitchSectionWrapper
        title="Show Next Ticket Preview"
        description="Display a preview of the next ticket while answering the current one"
        initialSwitchChecked={nextTicketPreviewEnabled}
        onSwitchChange={handleSwitchChange}
      >
        <></>
      </SwitchSectionWrapper>
    </div>
  );
};

export default NextTicketPreviewSetting;
