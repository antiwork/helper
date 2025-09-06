"use client";

import { useParams } from "next/navigation";
import Loading from "@/app/(dashboard)/loading";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { PageHeader } from "@/components/pageHeader";
import { Alert } from "@/components/ui/alert";
import { useDocumentTitle } from "@/components/useDocumentTitle";
import { api } from "@/trpc/react";
import ChatWidgetSetting from "../chat/chatWidgetSetting";
import CommonIssuesSetting from "../common-issues/commonIssuesSetting";
import AutoCloseSetting from "../customers/autoCloseSetting";
import CustomerSetting from "../customers/customerSetting";
import ConnectSupportEmail from "../integrations/connectSupportEmail";
import GitHubSetting from "../integrations/githubSetting";
import SlackSetting from "../integrations/slackSetting";
import KnowledgeSetting from "../knowledge/knowledgeSetting";
import MailboxSetting from "../preferences/mailboxSetting";
import PreferencesSetting from "../preferences/preferencesSetting";
import TeamSetting from "../team/teamSetting";
import ToolSetting from "../tools/toolSetting";

export default function TabsPage() {
  const params = useParams<{ tab: string }>();
  const { data: mailbox, error } = api.mailbox.get.useQuery();
  useDocumentTitle("Settings");

  if (error) return <Alert variant="destructive">Error loading mailbox: {error.message}</Alert>;
  if (!mailbox) return <Loading />;

  const items = [
    {
      label: "Knowledge",
      id: "knowledge",
      content: <KnowledgeSetting websitesEnabled={mailbox.firecrawlEnabled} />,
    },
    {
      label: "Team",
      id: "team",
      content: <TeamSetting />,
    },
    {
      label: "Common Issues",
      id: "common-issues",
      content: <CommonIssuesSetting />,
    },
    {
      label: "Customers",
      id: "customers",
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
      content: <ChatWidgetSetting mailbox={mailbox} />,
    },
    {
      label: "Integrations",
      id: "integrations",
      content: (
        <>
          <ToolSetting />
          <SlackSetting mailbox={mailbox} />
          <GitHubSetting mailbox={mailbox} />
          <ConnectSupportEmail />
        </>
      ),
    },
    {
      label: "Mailbox",
      id: "mailbox",
      content: <MailboxSetting mailbox={mailbox} />,
    },
    {
      label: "User preferences",
      id: "preferences",
      content: <PreferencesSetting />,
    },
  ];

  const selectedItem = items.find((item) => item.id === params.tab) || items[0];

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={selectedItem?.label ?? "Settings"} />
      <FileUploadProvider>
        <div className="grow overflow-y-auto">
          <div className="grow overflow-y-auto bg-background sm:px-6 pb-4 px-4">{selectedItem?.content}</div>
        </div>
      </FileUploadProvider>
    </div>
  );
}
