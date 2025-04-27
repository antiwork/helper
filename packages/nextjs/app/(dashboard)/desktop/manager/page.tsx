import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TabBar } from "@/app/(dashboard)/desktop/_components/tabBar";

export default async function ManagerPage({ searchParams }: { searchParams: Promise<{ initialTabUrl?: string }> }) {
  const { userId } = await auth();
  const { initialTabUrl } = await searchParams;
  if (!userId) return redirect(`/login?initialTabUrl=${encodeURIComponent(initialTabUrl ?? "")}`);

  return <TabBar initialTabUrl={initialTabUrl} />;
}
