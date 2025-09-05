import { redirect } from "next/navigation";
import { HelperClientProvider } from "@helperai/react";
import { getBaseUrl } from "@/components/constants";
import { getMailbox } from "@/lib/data/mailbox";
import { TRPCReactProvider } from "@/trpc/react";
import { HomepageContent } from "./homepageContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const mailbox = await getMailbox();

  if (!mailbox) redirect("/login");

  return (
    <TRPCReactProvider>
      <HelperClientProvider host={getBaseUrl()} session={{}}>
        <HomepageContent mailboxName={mailbox.name} />
      </HelperClientProvider>
    </TRPCReactProvider>
  );
}
