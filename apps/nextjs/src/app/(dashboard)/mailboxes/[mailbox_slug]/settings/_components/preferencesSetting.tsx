"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import ConfettiSetting, { type ConfettiUpdates } from "./confettiSetting";

export type PreferencesUpdates = {
  confettiSetting: ConfettiUpdates;
};

const PreferencesSetting = ({ onChange }: { onChange: (updates: PreferencesUpdates) => void }) => {
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
      <ConfettiSetting
        confettiData={data?.preferences}
        onChange={(updates) => onChange({ confettiSetting: updates })}
      />
    </div>
  );
};

export default PreferencesSetting;
