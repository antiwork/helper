import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
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
    const { preferences } = await api.mailbox.preferences.get({ mailboxSlug });

    return (
      // @ts-expect-error - need to update the React type definitions
      <HelperProvider host={env.AUTH_URL} mailbox_slug={mailboxSlug} show_toggle_button>
        <InboxClientLayout theme={preferences?.theme}>{children}</InboxClientLayout>
      </HelperProvider>
    );
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return redirect("/mailboxes");
    }
    throw e;
  }
}
