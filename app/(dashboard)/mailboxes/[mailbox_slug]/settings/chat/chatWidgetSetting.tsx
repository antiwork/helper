"use client";

import { useEffect, useState } from "react";
import { useShowChatWidget } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { mailboxes } from "@/db/schema";
import { RouterOutputs } from "@/trpc";
import { WidgetInstallation } from "./components/WidgetInstallation";
import { ChatVisibilitySettings } from "./components/ChatVisibilitySettings";
import { HostUrlSettings } from "./components/HostUrlSettings";
import { AutoRespondSettings } from "./components/AutoRespondSettings";

type WidgetMode = (typeof mailboxes.$inferSelect)["widgetDisplayMode"];

const ChatWidgetSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [mode, setMode] = useState<WidgetMode>(mailbox.widgetDisplayMode ?? "off");
  const [minValue, setMinValue] = useState(mailbox.widgetDisplayMinValue?.toString() ?? "100");
  const [autoRespond, setAutoRespond] = useState<"off" | "draft" | "reply">(
    mailbox.preferences?.autoRespondEmailToChat ?? "off",
  );
  const [widgetHost, setWidgetHost] = useState(mailbox.widgetHost ?? "");
  const { showChatWidget, setShowChatWidget } = useShowChatWidget();

  useEffect(() => {
    setShowChatWidget(mode !== "off");
    return () => setShowChatWidget(false);
  }, [mode, setShowChatWidget]);

  return (
    <div className="space-y-6">
      <WidgetInstallation mailbox={mailbox} />
      
      <ChatVisibilitySettings
        mailbox={mailbox}
        mode={mode}
        minValue={minValue}
        onModeChange={setMode}
        onMinValueChange={setMinValue}
      />

      <HostUrlSettings
        mailbox={mailbox}
        widgetHost={widgetHost}
        onWidgetHostChange={setWidgetHost}
      />

      <AutoRespondSettings
        mailbox={mailbox}
        autoRespond={autoRespond}
        onAutoRespondChange={setAutoRespond}
      />

      {showChatWidget && (
        <div className="fixed bottom-8 right-24 bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
          Try it out →
        </div>
      )}
    </div>
  );
};

export default ChatWidgetSetting;