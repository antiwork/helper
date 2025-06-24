"use client";

import { useBreakpoint } from "@/components/useBreakpoint";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Link, MonitorSmartphone, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import PreferencesSetting from "../preferences/preferencesSetting";
import KnowledgeSetting from "../knowledge/knowledgeSetting";
import TeamSetting from "../team/teamSetting";
import CustomerSetting from "../customers/customerSetting";
import AutoCloseSetting from "../customers/autoCloseSetting";
import ChatWidgetSetting from "../chat/chatWidgetSetting";
import ToolSetting from "../tools/toolSetting";
import MetadataEndpointSetting from "../tools/metadataEndpointSetting";
import SlackSetting from "../integrations/slackSetting";
import GitHubSetting from "../integrations/githubSetting";
import ConnectSupportEmail from "../integrations/connectSupportEmail";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Alert } from "@/components/ui/alert";
import Loading from "@/app/(dashboard)/loading";
import { PageHeader } from "@/components/pageHeader";
import { FileUploadProvider } from "@/components/fileUploadContext";
import SubNavigation from "../subNavigation";


export default function TabsPage() {
    const params = useParams<{ mailbox_slug: string, tab: string }>();
    const { data: mailbox, error } = api.mailbox.get.useQuery({ mailboxSlug: params.mailbox_slug });
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const { isBelowMd } = useBreakpoint("md");
    const router = useRouter();
    useEffect(() => setIsMobile(isBelowMd), [isBelowMd]);
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
    

    return (
        <div className="flex h-full flex-col">
          <PageHeader title="Settings" />
          <FileUploadProvider mailboxSlug={mailbox.slug}>
            <div className="grow overflow-y-auto">
              <SubNavigation items={items} />
            </div>
          </FileUploadProvider>
        </div>
      );
}