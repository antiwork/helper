import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { OnboardingStatus } from "./_components/OnboardingStatus";

interface PageProps {
  params: Promise<{ mailbox_slug: string }>;
}

export default async function OnboardingPage(props: PageProps) {
  const params = await props.params;
  const session = await auth();
  if (!session.userId) return redirect("/login");

  const mailbox = await api.mailbox.get({ mailboxSlug: params.mailbox_slug });

  if (!mailbox) {
    return redirect("/mailboxes");
  }

  return (
    <div className="container mx-auto py-8">
      <OnboardingStatus mailboxSlug={params.mailbox_slug} />
    </div>
  );
}
