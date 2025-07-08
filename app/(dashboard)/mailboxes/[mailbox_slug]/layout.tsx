import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import { HelperProvider } from "@helperai/react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { env } from "@/lib/env";

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  try {
    const { preferences } = await api.mailbox.get();

    return (
      <HelperProvider host={env.AUTH_URL} showToggleButton>
        <SidebarProvider>
          <InboxClientLayout>
            <div className="flex h-svh w-full">
              <AppSidebar />
              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </InboxClientLayout>
        </SidebarProvider>
      </HelperProvider>
    );
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return redirect("/mine");
    }
    throw e;
  }
}
