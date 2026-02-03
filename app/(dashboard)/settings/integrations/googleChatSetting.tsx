import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const isValidWebhookUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value.includes("chat.googleapis.com");
  } catch {
    return false;
  }
};

const GoogleChatSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const inputId = useId();
  const utils = api.useUtils();
  const { mutate: update, isPending } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
    },
    onError: (error) => {
      toast.error("Error updating Google Chat settings", { description: error.message });
    },
  });

  const [value, setValue] = useState(mailbox.googleChatWebhookUrl ?? "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setValue(mailbox.googleChatWebhookUrl ?? "");
  }, [mailbox.googleChatWebhookUrl]);

  const validation = useMemo(() => {
    if (!touched) return { ok: true, message: null as string | null };
    if (!value.trim()) return { ok: true, message: null };
    if (!isValidWebhookUrl(value)) return { ok: false, message: "Enter a valid Google Chat webhook URL." };
    return { ok: true, message: null };
  }, [touched, value]);

  const onBlur = () => {
    setTouched(true);
    if (!value.trim()) {
      update({ googleChatWebhookUrl: null });
      return;
    }
    if (!isValidWebhookUrl(value)) return;
    update({ googleChatWebhookUrl: value });
  };

  return (
    <SectionWrapper
      title="Google Chat Integration"
      description="Send daily reports and notifications to a Google Chat space via webhook."
    >
      <div className="grid gap-1">
        <Label htmlFor={inputId}>Webhook URL</Label>
        <Input
          id={inputId}
          inputMode="url"
          placeholder="https://chat.googleapis.com/v1/spaces/..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          disabled={isPending}
        />
        {validation.message ? <p className="mt-2 text-sm text-destructive">{validation.message}</p> : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Set this to enable Google Chat notifications for this mailbox.
        </p>
      </div>
    </SectionWrapper>
  );
};

export default GoogleChatSetting;

