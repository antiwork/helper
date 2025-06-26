"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/components/hooks/use-debounced-callback";
import { useOnChange } from "@/components/hooks/use-on-change";
import { useSavingIndicator } from "@/components/hooks/use-saving-indicator";
import { toast } from "@/components/hooks/use-toast";
import { SavingIndicator } from "@/components/savingIndicator";
import { Input } from "@/components/ui/input";
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

  const save = useDebouncedCallback(() => {
    savingIndicator.setState("saving");
    update({ mailboxSlug: mailbox.slug, name });
  }, 500);

  useOnChange(() => {
    save();
  }, [name]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SectionWrapper title="Mailbox name" description="Change the name of your mailbox">
        <div className="max-w-sm">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter mailbox name" />
        </div>
      </SectionWrapper>
    </div>
  );
};

export default MailboxNameSetting;
