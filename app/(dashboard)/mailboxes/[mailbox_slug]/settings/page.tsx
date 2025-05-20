"use client";

import { BookOpen, CreditCard, Link, MonitorSmartphone, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import Loading from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/loading";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { Alert } from "@/components/ui/alert";
import { api } from "@/trpc/react";
import ChatWidgetSetting from "./chat/chatWidgetSetting";
import AutoCloseSetting from "./customers/autoCloseSetting";
import CustomerSetting from "./customers/customerSetting";
import ConnectSupportEmail from "./integrations/connectSupportEmail";
import GitHubSetting from "./integrations/githubSetting";
import SlackSetting from "./integrations/slackSetting";
import KnowledgeSetting from "./knowledge/knowledgeSetting";
import PreferencesSetting from "./preferences/preferencesSetting";
import SubNavigation from "./subNavigation";
import Subscription from "./subscription";
import TeamSetting from "./team/teamSetting";
import MetadataEndpointSetting from "./tools/metadataEndpointSetting";
import ToolSetting from "./tools/toolSetting";

export default function SettingsPage() {
  const params = useParams<{ mailbox_slug: string }>();
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

  if (mailbox.billingEnabled) {
    items.push({
      label: "Billing",
      id: "billing",
      icon: CreditCard,
      content: <Subscription />,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" />
      <FileUploadProvider mailboxSlug={mailbox.slug}>
        <div className="grow overflow-y-auto">
          <SubNavigation
            items={items}
          />
        </div>
      </FileUploadProvider>
    </div>
  );
}
