import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAuthorizedMailbox } from "@/trpc/trpc";

export function withMailboxAuth(Component: React.ComponentType<any>) {
  return async function WithMailboxAuth(props: {
    params: Promise<{
      mailbox_slug: string;
      children: React.ReactNode;
    }>;
  }) {
    const { mailbox_slug } = await props.params;

    const session = await auth();
    // The mailboxes route will either set the orgId or redirect to the login page
    if (!session.userId || !session.orgId) return redirect("/mailboxes");

    const mailbox = await getAuthorizedMailbox(session.orgId, mailbox_slug);
    if (!mailbox) return redirect("/login");

    return <Component {...props} />;
  };
}
