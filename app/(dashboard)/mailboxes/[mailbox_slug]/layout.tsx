import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
import { env } from "@/lib/env";
import { HelperProvider } from "@/packages/react/dist/cjs";
import { api } from "@/trpc/server";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import { MobileSidebarButton } from "./MobileSidebarButton";

export default async function InboxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ mailbox_slug: string }>;
}) {
  try {
    const mailboxSlug = (await params).mailbox_slug;
    const { preferences } = await api.mailbox.get({ mailboxSlug });

    return (
      <HelperProvider host={env.AUTH_URL} mailboxSlug={mailboxSlug} showToggleButton>
        <SidebarProvider>
          <InboxClientLayout>
            <div className="flex h-svh w-full">
              <AppSidebar mailboxSlug={mailboxSlug} />
              <main className="flex-1 min-w-0">
                <MobileSidebarButton />
                {children}
              </main>
            </div>
          </InboxClientLayout>
        </SidebarProvider>
      </HelperProvider>
    );
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return redirect("/mailboxes");
    }
    throw e;
  }
}
