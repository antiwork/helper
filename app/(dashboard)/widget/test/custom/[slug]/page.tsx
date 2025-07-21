import { ConversationView } from "@/app/(dashboard)/widget/test/custom/[slug]/conversationView";
import { generateSession } from "@/app/(dashboard)/widget/test/custom/generateSession";
import { HelperClientProvider } from "@/app/(dashboard)/widget/test/custom/helperClientProvider";
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

  const session = generateSession(await searchParams);
  const { slug } = await params;

  return (
    <HelperClientProvider host="https://helperai.dev" session={session}>
      <ConversationView conversationSlug={slug} />
    </HelperClientProvider>
  );
}
