"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import SectionWrapper from "./sectionWrapper";

export type MailboxNameUpdates =
  | {
      name: string;
    }
  | undefined
  | null;

const MailboxNameSetting = ({
  mailboxName,
  onChange,
}: {
  mailboxName: string;
  onChange: (updates: MailboxNameUpdates) => void;
}) => {
  const [name, setName] = useState(mailboxName);

  const handleChange = (value: string) => {
    setName(value);
    onChange({ name: value });
  };

  return (
    <SectionWrapper title="Mailbox name" description="Change the name of your mailbox">
      <div className="max-w-sm">
        <Input value={name} onChange={(e) => handleChange(e.target.value)} placeholder="Enter mailbox name" />
      </div>
    </SectionWrapper>
  );
};

export default MailboxNameSetting;
