import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { DashboardContent } from "./dashboardContent";

const DashboardPage = async () => {
  try {
    await api.mailbox.get();
  } catch (_) {
    return redirect("/mailboxes");
  }

  return <DashboardContent />;
};

export default DashboardPage;
