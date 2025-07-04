import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { DashboardContent } from "./dashboardContent";

type PageProps = {
  mailbox_slug: string;
};

const DashboardPage = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;

  try {
    await api.mailbox.get({ mailboxSlug: params.mailbox_slug });
  } catch (_) {
    return redirect("/mailboxes");
  }

  return <DashboardContent mailboxSlug={params.mailbox_slug} />;
};

export default DashboardPage;
