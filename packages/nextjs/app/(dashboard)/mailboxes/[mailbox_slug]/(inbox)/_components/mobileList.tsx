import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { AppSidebarOpen } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/appSidebarOpen";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { CategoryNav } from "../../_components/categoryNav";
import { AppInstallBanner } from "./appInstallBanner";
import { List } from "./list";

export const MobileList = () => {
  const params = useParams<{ mailbox_slug: string; category: string }>();
  const mailboxSlug = params.mailbox_slug;
  const [conversationSlug] = useQueryState("id");

  const { data: openCount } = api.mailbox.openCount.useQuery(
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
      <AppInstallBanner />
      <CategoryNav
        openCount={openCount}
        mailboxSlug={mailboxSlug}
        variant="mobile"
        className="flex items-center h-14 px-4"
        prefix={
          <div className="shrink-0 mr-2">
            <AppSidebarOpen mailboxSlug={mailboxSlug} />
          </div>
        }
      />
      <List variant="mobile" />
    </div>
  );
};
