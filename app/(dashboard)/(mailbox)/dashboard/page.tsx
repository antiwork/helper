import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { DashboardContent } from "./dashboardContent";

const DashboardPage = async () => {
  const currentMailbox = await api.mailbox.get();

  if (!currentMailbox) {
    return redirect("/mailboxes");
  }

  return <DashboardContent />;
};

export default DashboardPage;
