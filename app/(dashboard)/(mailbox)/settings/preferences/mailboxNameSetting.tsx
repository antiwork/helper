"use client";

import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const MailboxNameSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [name, setName] = useState(mailbox.name);
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error updating preferences",
        description: error.message,
      });
    },
  });

  const save = useDebouncedCallback(() => {
    update({ name });
  }, 2000);

  useOnChange(() => {
    save();
  }, [name]);

  return (
    <SectionWrapper title="Mailbox name" description="Change the name of your mailbox">
      <div className="max-w-sm">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter mailbox name" />
      </div>
    </SectionWrapper>
  );
};

export default MailboxNameSetting;
