"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

export const NextTicketPreviewSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [nextTicketPreviewEnabled, setNextTicketPreviewEnabled] = useState(
    mailbox.preferences?.showNextTicketPreview ?? false,
  );
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating preferences", { description: error.message });
      setNextTicketPreviewEnabled(mailbox.preferences?.showNextTicketPreview ?? false);
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    setNextTicketPreviewEnabled(checked);
    savingIndicator.setState("saving");
    update({
      preferences: {
        showNextTicketPreview: checked,
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
        description="Display a preview of the next ticket while answering the current one. This helps agents prepare for the next conversation and work more efficiently."
        initialSwitchChecked={nextTicketPreviewEnabled}
        onSwitchChange={handleSwitchChange}
      />
    </div>
  );
};
