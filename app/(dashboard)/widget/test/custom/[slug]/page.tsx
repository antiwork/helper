import { HelperClientProvider } from "@helperai/react";
import { ConversationView } from "@/app/(dashboard)/widget/test/custom/[slug]/conversationView";
import { generateSession } from "@/app/(dashboard)/widget/test/custom/generateSession";
import { getBaseUrl } from "@/components/constants";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== "https://helperai.dev") {
    return <div>Only available in development</div>;
  }

  const { slug } = await params;

  return (
    <HelperClientProvider host="https://helperai.dev" session={generateSession(await searchParams)}>
      <ConversationView conversationSlug={slug} />
    </HelperClientProvider>
  );
}
