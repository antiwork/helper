import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { DashboardContent } from "./dashboardContent";

type PageProps = {
  mailbox_slug: string;
};

const DashboardPage = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;

  try {
    const mailbox = await api.mailbox.get();
    if (!mailbox || mailbox.slug !== params.mailbox_slug) {
      return redirect("/mailboxes");
    }
  } catch {
    return redirect("/mailboxes");
  }

  return <DashboardContent mailboxSlug={params.mailbox_slug} />;
};

export default DashboardPage;
