import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { AppSidebarOpen } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/appSidebarOpen";
import { TauriDragArea } from "@/components/tauriDragArea";
import { useNativePlatform } from "@/components/useNativePlatform";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { CategoryNav } from "../../_components/categoryNav";
import { AppInstallBanner } from "./appInstallBanner";
import { List } from "./list";

export const MobileList = () => {
  const params = useParams<{ mailbox_slug: string; category: string }>();
  const mailboxSlug = params.mailbox_slug;
  const [conversationSlug] = useQueryState("id");
  const { nativePlatform, isLegacyTauri } = useNativePlatform();

  const { data: countData } = api.mailbox.countByStatus.useQuery(
    { mailboxSlug },
    {
      staleTime: 0,
    },
  );

  return (
    <div
      aria-label="Inbox"
      className={cn(
        `relative flex w-full min-w-[20rem] flex-col h-[100dvh] bg-background`,
        conversationSlug ? "hidden" : "",
      )}
    >
      {nativePlatform === "macos" && isLegacyTauri && <TauriDragArea className="top-0 inset-x-0 h-8" />}
      <AppInstallBanner />
      <CategoryNav
        countByStatus={countData}
        mailboxSlug={mailboxSlug}
        variant="mobile"
        className={cn("flex items-center h-14 px-4", nativePlatform === "macos" && "mt-8")}
        prefix={
          <div className="flex-shrink-0 mr-2">
            <AppSidebarOpen mailboxSlug={mailboxSlug} />
          </div>
        }
      />
      <List mailboxSlug={mailboxSlug} variant="mobile" />
    </div>
  );
};
