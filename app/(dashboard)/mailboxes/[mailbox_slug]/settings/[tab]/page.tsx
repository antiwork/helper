"use client";

import { BookOpen, Link, MonitorSmartphone, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import { useParams } from "next/navigation";
import Loading from "@/app/(dashboard)/loading";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { Alert } from "@/components/ui/alert";
import { api } from "@/trpc/react";
import ChatWidgetSetting from "../chat/chatWidgetSetting";
import AutoCloseSetting from "../customers/autoCloseSetting";
import CustomerSetting from "../customers/customerSetting";
import ConnectSupportEmail from "../integrations/connectSupportEmail";
import GitHubSetting from "../integrations/githubSetting";
import SlackSetting from "../integrations/slackSetting";
import KnowledgeSetting from "../knowledge/knowledgeSetting";
import PreferencesSetting from "../preferences/preferencesSetting";
import SubNavigation from "../subNavigation";
import TeamSetting from "../team/teamSetting";
import MetadataEndpointSetting from "../tools/metadataEndpointSetting";
import ToolSetting from "../tools/toolSetting";

export default function TabsPage() {
  const params = useParams<{ mailbox_slug: string; tab: string }>();
  const { data: mailbox, error } = api.mailbox.get.useQuery({ mailboxSlug: params.mailbox_slug });
  if (error) return <Alert variant="destructive">Error loading mailbox: {error.message}</Alert>;
  if (!mailbox) return <Loading />;

  const items = [
    {
      label: "Knowledge",
      id: "knowledge",
      icon: BookOpen,
      content: <KnowledgeSetting websitesEnabled={mailbox.firecrawlEnabled} />,
    },
    {
      label: "Team",
      id: "team",
      icon: Users,
      content: <TeamSetting mailboxSlug={mailbox.slug} />,
    },
    {
      label: "Customers",
      id: "customers",
      icon: UserPlus,
      content: (
        <>
          <CustomerSetting mailbox={mailbox} />
          <AutoCloseSetting mailbox={mailbox} />
        </>
      ),
    },
    {
      label: "In-App Chat",
      id: "in-app-chat",
      icon: MonitorSmartphone,
      content: <ChatWidgetSetting mailbox={mailbox} />,
    },
    {
      label: "Integrations",
      id: "integrations",
      icon: Link,
      content: (
        <>
          <ToolSetting mailboxSlug={mailbox.slug} />
          <MetadataEndpointSetting metadataEndpoint={mailbox.metadataEndpoint} />
          <SlackSetting mailbox={mailbox} />
          <GitHubSetting mailbox={mailbox} />
          <ConnectSupportEmail />
        </>
      ),
    },
    {
      label: "Preferences",
      id: "preferences",
      icon: SettingsIcon,
      content: <PreferencesSetting mailbox={mailbox} />,
    },
  ];

  const selectedItem = items.find((item) => item.id === params.tab) || items[0];

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={selectedItem?.label ?? "Settings"} />
      <FileUploadProvider mailboxSlug={mailbox.slug}>
        <div className="grow overflow-y-auto">
          <div className="grow overflow-y-auto bg-background px-4 pb-4">{selectedItem?.content}</div>
        </div>
      </FileUploadProvider>
    </div>
  );
}
