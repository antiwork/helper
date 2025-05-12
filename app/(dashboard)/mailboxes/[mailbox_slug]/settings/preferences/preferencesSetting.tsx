"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import ConfettiSetting from "./confettiSetting";
import MailboxNameSetting from "./mailboxNameSetting";
import ThemeSetting from "./themeSetting";

const PreferencesSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const params = useParams<{ mailbox_slug: string }>();
  const { data, isLoading } = api.mailbox.preferences.get.useQuery({
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
      {mailbox && <MailboxNameSetting mailbox={mailbox} />}
      {data && (
        <>
          <ConfettiSetting mailbox={mailbox} preferences={data} />
          <ThemeSetting mailbox={mailbox} preferences={data} />
        </>
      )}
    </div>
  );
};

export default PreferencesSetting;
