import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { NavigationRail } from "@/components/navigationRail";
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
    const { preferences } = await api.mailbox.get({ mailboxSlug });

    return (
      <HelperProvider host={env.AUTH_URL} mailboxSlug={mailboxSlug} showToggleButton>
        <div className="flex flex-row min-h-svh w-full">
          <div className="hidden md:block text-sidebar-foreground">
            <NavigationRail mailboxSlug={mailboxSlug} />
          </div>
          <main className="flex-1 text-foreground bg-background w-full min-w-0">
            <InboxClientLayout theme={preferences?.theme}>{children}</InboxClientLayout>
          </main>
        </div>
      </HelperProvider>
    );
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return redirect("/mailboxes");
    }
    throw e;
  }
}
