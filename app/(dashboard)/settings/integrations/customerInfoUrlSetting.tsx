"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const CustomerInfoUrlSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [customerInfoUrl, setCustomerInfoUrl] = useState(mailbox.customerInfoUrl || "");
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();

  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating customer info URL", { description: error.message });
    },
  });

  const save = useDebouncedCallback(() => {
    savingIndicator.setState("saving");
    update({ customerInfoUrl: customerInfoUrl || null });
  }, 500);

  useOnChange(() => {
    save();
  }, [customerInfoUrl]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SectionWrapper 
        title="Customer Info URL" 
        description="URL to fetch additional customer information for email tickets"
      >
        <div className="max-w-sm">
          <Input 
            value={customerInfoUrl} 
            onChange={(e) => setCustomerInfoUrl(e.target.value)} 
            placeholder="https://example.com/customer-info" 
            type="url"
          />
        </div>
      </SectionWrapper>
    </div>
  );
};

export default CustomerInfoUrlSetting;
