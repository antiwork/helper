import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import { HelperProvider } from "@helperai/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { env } from "@/lib/env";
import { api } from "@/trpc/server";
import { AppSidebar } from "./appSidebar";
import InboxClientLayout from "./clientLayout";

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  try {
    const { slug, preferences } = await api.mailbox.get();

    return (
      <HelperProvider host={env.AUTH_URL} mailboxSlug={slug} showToggleButton>
        <SidebarProvider>
          <InboxClientLayout theme={preferences?.theme}>
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
      return redirect("/mailboxes");
    }
    throw e;
  }
}
