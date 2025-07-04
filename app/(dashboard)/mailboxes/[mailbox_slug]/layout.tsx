import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { env } from "@/lib/env";
import { HelperProvider } from "@/packages/react/dist/cjs";
import { api } from "@/trpc/server";

export default async function InboxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ mailbox_slug: string }>;
}) {
  try {
    const mailboxSlug = (await params).mailbox_slug;

    return (
      <HelperProvider host={env.AUTH_URL} mailboxSlug={mailboxSlug} showToggleButton>
        <SidebarProvider>
          <InboxClientLayout>
            <div className="flex h-svh w-full">
              <AppSidebar mailboxSlug={mailboxSlug} />
              <main className="flex-1 min-w-0">{children}</main>
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
