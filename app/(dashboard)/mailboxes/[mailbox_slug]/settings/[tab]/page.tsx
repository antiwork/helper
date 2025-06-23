"use client";

import { BookOpen, Link, MonitorSmartphone, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import Loading from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/[tab]/loading";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { Alert } from "@/components/ui/alert";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import ChatWidgetSetting from "./chat/chatWidgetSetting";
import AutoCloseSetting from "./customers/autoCloseSetting";
import CustomerSetting from "./customers/customerSetting";
import ConnectSupportEmail from "./integrations/connectSupportEmail";
import GitHubSetting from "./integrations/githubSetting";
import SlackSetting from "./integrations/slackSetting";
import KnowledgeSetting from "./knowledge/knowledgeSetting";
import PreferencesSetting from "./preferences/preferencesSetting";
import TeamSetting from "./team/teamSetting";
import MetadataEndpointSetting from "./tools/metadataEndpointSetting";
import ToolSetting from "./tools/toolSetting";

export default function SettingsPage() {
  const params = useParams<{ mailbox_slug: string; tab: string }>();
  const { data: mailbox, error } = api.mailbox.get.useQuery({ mailboxSlug: params.mailbox_slug });

  if (error) return <Alert variant="destructive">Error loading mailbox: {error.message}</Alert>;
  if (!mailbox) return <Loading />;

  function renderSettingContentById(id: string, mailbox: RouterOutputs["mailbox"]["get"]) {
    switch (id) {
      case "knowledge":
        return <KnowledgeSetting websitesEnabled={mailbox.firecrawlEnabled} />;
      case "team":
        return <TeamSetting mailboxSlug={mailbox.slug} />;
      case "customers":
        return (
          <>
            <CustomerSetting mailbox={mailbox} />
            <AutoCloseSetting mailbox={mailbox} />
          </>
        );
      case "in-app-chat":
        return <ChatWidgetSetting mailbox={mailbox} />;
      case "integrations":
        return (
          <>
            <ToolSetting mailboxSlug={mailbox.slug} />
            <MetadataEndpointSetting metadataEndpoint={mailbox.metadataEndpoint} />
            <SlackSetting mailbox={mailbox} />
            <GitHubSetting mailbox={mailbox} />
            <ConnectSupportEmail />
          </>
        );
      case "preferences":
        return <PreferencesSetting mailbox={mailbox} />;
      default:
        return null;
    }
  }

  const content = renderSettingContentById(params.tab, mailbox);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" />
      <FileUploadProvider mailboxSlug={mailbox.slug}>
        <div className="grow overflow-y-auto">
          <div className="flex-1 overflow-auto p-6">{content}</div>
        </div>
      </FileUploadProvider>
    </div>
  );
}
