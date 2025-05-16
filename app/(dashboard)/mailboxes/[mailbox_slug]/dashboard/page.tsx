import { redirect } from "next/navigation";
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
    return redirect("/mailboxes");
  }

  return <DashboardContent mailboxSlug={params.mailbox_slug} currentMailbox={currentMailbox} />;
};

export default DashboardPage;
