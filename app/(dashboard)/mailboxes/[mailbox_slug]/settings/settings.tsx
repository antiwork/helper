"use client";

import {
  BookOpenIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  LinkIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import React, { useState, useTransition } from "react";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import type { SupportAccount } from "@/app/types/global";
import { FileUploadProvider } from "@/components/fileUploadContext";
import { toast } from "@/components/hooks/use-toast";
import { PageHeader } from "@/components/pageHeader";
import { Button } from "@/components/ui/button";
import { mailboxes } from "@/db/schema";
import { RouterOutputs } from "@/trpc";
import { SidebarInfo } from "../getSidebarInfo";
import ChatWidgetSetting from "./chat/chatWidgetSetting";
import AutoCloseSetting, { AutoCloseUpdates } from "./customers/autoCloseSetting";
import CustomerSetting, { type CustomerUpdates } from "./customers/customerSetting";
import ConnectSupportEmail from "./integrations/connectSupportEmail";
import GitHubSetting, { type GitHubUpdates } from "./integrations/githubSetting";
import SlackSetting, { type SlackUpdates } from "./integrations/slackSetting";
import KnowledgeSetting from "./knowledge/knowledgeSetting";
import PreferencesSetting, { PreferencesUpdates } from "./preferences/preferencesSetting";
import SubNavigation from "./subNavigation";
import Subscription from "./subscription";
import TeamSetting from "./team/teamSetting";
import MetadataEndpointSetting from "./tools/metadataEndpointSetting";
import ToolSetting from "./tools/toolSetting";

export type PendingUpdates = {
  slack?: SlackUpdates;
  github?: GitHubUpdates;

  widget?: {
    displayMode: (typeof mailboxes.$inferSelect)["widgetDisplayMode"];
    displayMinValue?: number;
    autoRespondEmailToChat?: boolean;
    widgetHost?: string;
  };
  customer?: CustomerUpdates;
  autoClose?: AutoCloseUpdates;
  preferences?: PreferencesUpdates;
};

type SettingsProps = {
  children?: React.ReactElement<any> | React.ReactElement<any>[];
  onUpdateSettings: (pendingUpdates: PendingUpdates) => Promise<void>;
  mailbox: RouterOutputs["mailbox"]["get"];
  supportAccount?: SupportAccount;
  sidebarInfo: SidebarInfo;
};

const Settings = ({ onUpdateSettings, mailbox, supportAccount }: SettingsProps) => {
  const [isTransitionPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdates>({});

  const handleUpdateSettings = async () => {
    if (!hasPendingUpdates) return;

    startTransition(() => setIsUpdating(true));
    try {
      await onUpdateSettings(pendingUpdates);
      setPendingUpdates({});
      toast({
        title: "Settings updated!",
        variant: "success",
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Something went wrong";
      toast({
        title: error,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const hasPendingUpdates =
    Boolean(pendingUpdates.slack) ||
    Boolean(pendingUpdates.github) ||
    Boolean(pendingUpdates.widget) ||
    Boolean(pendingUpdates.customer) ||
    Boolean(pendingUpdates.autoClose) ||
    Boolean(pendingUpdates.preferences);

  const items = [
    {
      label: "Knowledge",
      id: "knowledge",
      icon: BookOpenIcon,
      content: <KnowledgeSetting websitesEnabled={mailbox.firecrawlEnabled} />,
    },
    {
      label: "Team",
      id: "team",
      icon: UsersIcon,
      content: <TeamSetting mailboxSlug={mailbox.slug} />,
    },
    {
      label: "Customers",
      id: "customers",
      icon: UserGroupIcon,
      content: (
        <>
          <CustomerSetting
            mailbox={mailbox}
            onChange={(customerChanges) =>
              setPendingUpdates({
                ...pendingUpdates,
                customer: customerChanges,
              })
            }
          />
          <AutoCloseSetting
            mailbox={mailbox}
            onChange={(autoCloseUpdates) => {
              setPendingUpdates((prev) => ({
                ...prev,
                autoClose: autoCloseUpdates,
              }));
            }}
            onSave={handleUpdateSettings}
          />
        </>
      ),
    },
    {
      label: "In-App Chat",
      id: "in-app-chat",
      icon: ComputerDesktopIcon,
      content: (
        <ChatWidgetSetting
          mailbox={mailbox}
          onChange={(widgetChanges) =>
            setPendingUpdates({
              ...pendingUpdates,
              widget: widgetChanges,
            })
          }
        />
      ),
    },
    {
      label: "Integrations",
      id: "integrations",
      icon: LinkIcon,
      content: (
        <>
          <ToolSetting mailboxSlug={mailbox.slug} />
          <MetadataEndpointSetting metadataEndpoint={mailbox.metadataEndpoint} />
          <SlackSetting
            mailbox={mailbox}
            onChange={(slackUpdates) => {
              setPendingUpdates((prev) => ({
                ...prev,
                slack: slackUpdates,
              }));
            }}
          />
          <GitHubSetting
            mailbox={mailbox}
            onChange={(githubChanges) =>
              setPendingUpdates({
                ...pendingUpdates,
                github: { ...pendingUpdates.github, ...githubChanges },
              })
            }
          />
          <ConnectSupportEmail supportAccount={supportAccount} />
        </>
      ),
    },
    {
      label: "Preferences",
      id: "preferences",
      icon: Cog6ToothIcon,
      content: (
        <PreferencesSetting
          onChange={(updates) =>
            setPendingUpdates({
              ...pendingUpdates,
              preferences: updates,
            })
          }
        />
      ),
    },
  ];

  if (mailbox.billingEnabled) {
    items.push({
      label: "Billing",
      id: "billing",
      icon: CreditCardIcon,
      content: <Subscription />,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings">
        <Button disabled={isUpdating || isTransitionPending || !hasPendingUpdates} onClick={handleUpdateSettings}>
          Update settings
        </Button>
      </PageHeader>

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
