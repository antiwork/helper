import { ConversationView } from "@/app/(dashboard)/widget/test/custom/[slug]/conversationView";
import { generateSession } from "@/app/(dashboard)/widget/test/custom/generateSession";
import { HelperClientProvider } from "@/app/(dashboard)/widget/test/custom/helperClientProvider";
import { getBaseUrl } from "@/components/constants";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== env.HELPER_HOST) {
    return <div>Only available in development</div>;
  }

  const session = generateSession(await searchParams);
  const { slug } = await params;

  return (
    <HelperClientProvider host={env.HELPER_HOST} session={session}>
      <ConversationView conversationSlug={slug} />
    </HelperClientProvider>
  );
}
