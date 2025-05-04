import { withMailboxAuth } from "@/components/withMailboxAuth";
import { api } from "@/trpc/server";
import { DashboardContent } from "./dashboardContent";

type PageProps = {
  mailbox_slug: string;
};

const DashboardPage = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;
  const mailboxes = await api.mailbox.list();
  const currentMailbox = mailboxes.find((m) => m.slug === params.mailbox_slug);

  if (!currentMailbox) {
    throw new Error("Mailbox not found");
  }

  return <DashboardContent mailboxSlug={params.mailbox_slug} currentMailbox={currentMailbox} />;
};

export default withMailboxAuth(DashboardPage);
