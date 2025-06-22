"use client";

import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { Input } from "@/components/ui/input";
import { SavingIndicator } from "@/components/ui/savingIndicator";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const MailboxNameSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [name, setName] = useState(mailbox.name);
  const savingIndicator = useSavingIndicator();
  const utils = api.useUtils();
  
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
      savingIndicator.setSaved();
    },
    onError: (error) => {
      savingIndicator.setError();
      toast({
        title: "Error updating preferences",
        description: error.message,
      });
    },
  });

  const save = useDebouncedCallback(() => {
    savingIndicator.setSaving();
    update({ mailboxSlug: mailbox.slug, name });
  }, 500); // Reduced from 2000ms to 500ms

  useOnChange(() => {
    save();
  }, [name]);

  return (
    <SectionWrapper title="Mailbox name" description="Change the name of your mailbox">
      <div className="max-w-sm relative">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter mailbox name" />
        <div className="absolute -top-1 -right-1">
          <SavingIndicator state={savingIndicator.state} />
        </div>
      </div>
    </SectionWrapper>
  );
};

export default MailboxNameSetting;
