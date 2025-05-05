import InboxClientLayout from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { api } from "@/trpc/server";

export default async function InboxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ mailbox_slug: string }>;
}) {
  const { preferences } = await api.mailbox.preferences.get({
    mailboxSlug: (await params).mailbox_slug,
  });

  return <InboxClientLayout theme={preferences?.theme}>{children}</InboxClientLayout>;
}
