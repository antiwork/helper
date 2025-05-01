"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ChartBarIcon, InboxIcon as HeroInbox } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ChevronsUpDown, Download, Settings, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SidebarInfo } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/getSidebarInfo";
import { NavigationButtons } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/navigationButtons";
import { InboxProvider } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/inbox";
import { List } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/list";
import { TauriDragArea } from "@/components/tauriDragArea";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getTauriPlatform, useNativePlatform } from "@/components/useNativePlatform";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { AccountDropdown } from "./accountDropdown";
import { CategoryNav } from "./categoryNav";
import NativeAppModal, {
  isMac,
  isWindows,
  LINUX_APPIMAGE_URL,
  MAC_UNIVERSAL_INSTALLER_URL,
  WINDOWS_INSTALLER_URL,
} from "./nativeAppModal";

type Props = {
  mailboxSlug: string;
  sidebarInfo: SidebarInfo;
};

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

export function AppSidebar({ mailboxSlug, sidebarInfo }: Props) {
  const { mailboxes, currentMailbox, trialInfo } = sidebarInfo;
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { nativePlatform, isLegacyTauri, isDesktopWeb } = useNativePlatform();
  const { user } = useUser();
  const [showNativeAppModal, setShowNativeAppModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const { data: openCount } = api.mailbox.openCount.useQuery({ mailboxSlug });

  const { mutate: startCheckout } = api.billing.startCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  useEffect(() => {
    setShowUpgradePrompt(trialInfo.subscriptionStatus !== "paid" && !!trialInfo.freeTrialEndsAt && !getTauriPlatform());
  }, [trialInfo]);

  const isSettings = pathname.endsWith("/settings");
  const isInbox = pathname.includes("/conversations");

  return (
    <Sidebar
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        nativePlatform === "macos" && isLegacyTauri && "pt-6",
      )}
    >
      {nativePlatform === "macos" && isLegacyTauri && (
        <TauriDragArea className="top-0 left-0 w-(--sidebar-width) h-8" />
      )}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="only:flex-1 w-auto min-w-0 data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:p-1.5! h-10">
                  <div className="flex items-center justify-center">
                    <Avatar src={undefined} fallback={currentMailbox?.name ?? "(no name)"} size="sm" />
                  </div>
                  <span className="text-lg text-sidebar-foreground truncate">{currentMailbox?.name}</span>
                  <ChevronsUpDown className="ml-auto text-sidebar-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-popper-anchor-width)">
                {mailboxes.map((mailbox) => (
                  <DropdownMenuItem key={mailbox.slug} asChild>
                    <Link href={`/mailboxes/${mailbox.slug}/conversations`} prefetch={false}>
                      <Avatar src={undefined} fallback={mailbox.name} size="sm" />
                      <span className="truncate text-base">{mailbox.name}</span>
                      <span className="ml-auto">
                        {mailbox.slug === currentMailbox?.slug && <CheckCircleIcon className="text-foreground" />}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <NavigationButtons />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col flex-1 overflow-hidden">
        {isMobile ? (
          <div className="flex flex-col gap-2 p-2">
            <Link
              href={`/mailboxes/${mailboxSlug}/conversations`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                isInbox && "bg-sidebar-accent",
              )}
            >
              <HeroInbox className="h-4 w-4" />
              <span>Inbox</span>
            </Link>
            <Link
              href={`/mailboxes/${mailboxSlug}/settings`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                isSettings && "bg-sidebar-accent",
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        ) : (
          <>
            <CategoryNav openCount={openCount} mailboxSlug={mailboxSlug} variant="sidebar" />
            <ConversationList mailboxSlug={mailboxSlug} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {showUpgradePrompt && (
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col gap-2 rounded-lg bg-sidebar-accent p-3 text-center">
                {trialInfo.subscriptionStatus !== "free_trial_expired" && (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2 justify-between">
                      <div className="text-sm">AI resolutions</div>
                      <div className="text-sm opacity-50">
                        {trialInfo.resolutionsCount}/{trialInfo.resolutionsLimit}
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-sidebar-accent">
                      <div
                        className="h-2 rounded-full bg-sidebar-foreground"
                        style={{
                          width: `${((trialInfo.resolutionsCount ?? 0) / (trialInfo.resolutionsLimit ?? 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                <Button variant="bright" size="sm" onClick={() => startCheckout({ mailboxSlug })}>
                  Upgrade
                </Button>
                {trialInfo.subscriptionStatus === "free_trial_expired" ? (
                  <div className="text-xs">
                    Your trial period has ended. Please upgrade to continue using AI features.
                  </div>
                ) : (
                  <div className="text-xs">
                    Free trial until{" "}
                    {new Date(trialInfo.freeTrialEndsAt!).toLocaleString("en-US", { month: "long", day: "numeric" })}
                  </div>
                )}
              </div>
            </SidebarMenuItem>
          )}
          {isDesktopWeb && user && !user.unsafeMetadata?.desktopAppPromptDismissed && (
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col rounded-lg bg-sidebar-accent p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Get the desktop app</span>
                  <Button
                    variant="sidebar"
                    size="sm"
                    className="w-5 h-5 p-0"
                    onClick={() =>
                      void user?.update({
                        unsafeMetadata: {
                          ...user.unsafeMetadata,
                          desktopAppPromptDismissed: true,
                        },
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="bright" asChild>
                  <a
                    href={
                      isMac() ? MAC_UNIVERSAL_INSTALLER_URL : isWindows() ? WINDOWS_INSTALLER_URL : LINUX_APPIMAGE_URL
                    }
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isMac() ? "Download for Mac" : isWindows() ? "Download for Windows" : "Download for Linux"}
                  </a>
                </Button>
                <Button variant="sidebar-link" size="sm" onClick={() => setShowNativeAppModal(true)}>
                  More options
                </Button>
              </div>
            </SidebarMenuItem>
          )}
          {!isMobile && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`/mailboxes/${mailboxSlug}/dashboard`}>
                    <ChartBarIcon className="stroke-px text-sidebar-foreground" />
                    <span className="text-base text-sidebar-foreground">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isSettings}>
                  <Link href={`/mailboxes/${mailboxSlug}/settings`}>
                    <Settings className="stroke-px text-sidebar-foreground" />
                    <span className="text-base text-sidebar-foreground">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <AccountDropdown
              setShowNativeAppModal={setShowNativeAppModal}
              trigger={(children) => (
                <SidebarMenuButton
                  className={cn(
                    "data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:p-1.5! text-sidebar-foreground",
                    "h-10 px-2 mb-2 md:h-8 md:mb-0",
                  )}
                >
                  {children}
                </SidebarMenuButton>
              )}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <NativeAppModal open={showNativeAppModal} onOpenChange={setShowNativeAppModal} />
    </Sidebar>
  );
}

const ConversationListContent = ({ mailboxSlug }: { mailboxSlug: string }) => (
  <div className="flex-1 overflow-hidden flex h-full flex-col">
    <InboxProvider>
      <List variant="desktop" />
    </InboxProvider>
  </div>
);

const ConversationList = dynamic(() => Promise.resolve(ConversationListContent), {
  ssr: false,
});

const DeleteAccountListener = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn]);
  return null;
};
