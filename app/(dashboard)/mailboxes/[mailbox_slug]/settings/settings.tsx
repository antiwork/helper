"use client";

import { BookOpen, CreditCard, Link, MonitorSmartphone, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import React from "react";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import type { SupportAccount } from "@/app/types/global";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { RouterOutputs } from "@/trpc";
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

type SettingsProps = {
  children?: React.ReactElement<any> | React.ReactElement<any>[];
  mailbox: RouterOutputs["mailbox"]["get"];
  supportAccount?: SupportAccount;
};

const Settings = ({ mailbox, supportAccount }: SettingsProps) => {
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
          <ConnectSupportEmail supportAccount={supportAccount} />
        </>
      ),
    },
    {
      label: "Preferences",
      id: "preferences",
      icon: SettingsIcon,
      content: <PreferencesSetting />,
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
            footer={
              <div className="border-t border-border">
                <AccountDropdown
                  trigger={(children) => (
                    <button className="flex h-12 w-full items-center gap-2 px-4 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {children}
                    </button>
                  )}
                />
              </div>
            }
          />
        </div>
      </FileUploadProvider>
    </div>
  );
};

export default Settings;
