import { redirect } from "next/navigation";
import { HelperClientProvider } from "@helperai/react";
import { getMailbox } from "@/lib/data/mailbox";
import { env } from "@/lib/env";
import { TRPCReactProvider } from "@/trpc/react";
import { HomepageContent } from "./homepageContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const mailbox = await getMailbox();

  if (!mailbox) redirect("/login");

  return (
    <TRPCReactProvider>
      <HelperClientProvider host={env.NEXT_PUBLIC_DEV_HOST} session={{}}>
        <HomepageContent mailboxName={mailbox.name} />
      </HelperClientProvider>
    </TRPCReactProvider>
  );
}
