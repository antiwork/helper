"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import ConfettiSetting, { type ConfettiUpdates } from "./confettiSetting";
import MailboxNameSetting, { type MailboxNameUpdates } from "./mailboxNameSetting";

export type PreferencesUpdates = {
  confettiSetting: ConfettiUpdates;
  mailboxNameSetting?: MailboxNameUpdates;
};

const PreferencesSetting = ({ onChange }: { onChange: (updates: PreferencesUpdates) => void }) => {
  const params = useParams<{ mailbox_slug: string }>();

  const { data, isLoading } = api.mailbox.preferences.get.useQuery({
    mailboxSlug: params.mailbox_slug,
  });

  const { data: mailboxData } = api.mailbox.get.useQuery({
    mailboxSlug: params.mailbox_slug,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {mailboxData && (
        <MailboxNameSetting
          mailboxName={mailboxData.name}
          onChange={(updates) => onChange({ confettiSetting: data?.preferences, mailboxNameSetting: updates })}
        />
      )}
      <ConfettiSetting
        confettiData={data?.preferences}
        onChange={(updates) => onChange({ confettiSetting: updates })}
      />
    </div>
  );
};

export default PreferencesSetting;
