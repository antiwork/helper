"use client";

import { useEffect } from "react";
import { useManualSave } from "@/components/hooks/useManualSave";
import { Input } from "@/components/ui/input";
import { SaveableForm } from "@/components/ui/saveableForm";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const MailboxNameSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation();

  const { currentData, isDirty, isLoading, updateData, handleSave, handleCancel, handleReset } = useManualSave(
    { name: mailbox.name },
    {
      onSave: async (data) => {
        await new Promise<void>((resolve, reject) => {
          update(
            { mailboxSlug: mailbox.slug, name: data.name },
            {
              onSuccess: () => {
                utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
                resolve();
              },
              onError: reject,
            },
          );
        });
      },
      successMessage: "Mailbox name updated successfully",
      errorMessage: "Failed to update mailbox name",
    },
  );

  useEffect(() => {
    handleReset({ name: mailbox.name });
  }, [mailbox.name, handleReset]);

  return (
    <SectionWrapper title="Mailbox name" description="Change the name of your mailbox">
      <SaveableForm isDirty={isDirty} isLoading={isLoading} onSave={handleSave} onCancel={handleCancel}>
        <div className="max-w-sm">
          <Input
            value={currentData.name}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="Enter mailbox name"
          />
        </div>
      </SaveableForm>
    </SectionWrapper>
  );
};

export default MailboxNameSetting;
