import { HelperClientProvider } from "@helperai/react";
import { ConversationView } from "@/app/(dashboard)/widget/test/custom/[slug]/conversationView";
import { getBaseUrl } from "@/components/constants";
import { env } from "@/lib/env";
import { generateHelperAuth } from "@/packages/client/dist/auth";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== env.NEXT_PUBLIC_DEV_HOST) {
    return <div>Only available in development</div>;
  }

  const { slug } = await params;
  const { email, anonymous } = await searchParams;

  return (
    <HelperClientProvider
      host={env.NEXT_PUBLIC_DEV_HOST}
      session={anonymous ? {} : generateHelperAuth({ email: email ?? "test@example.com" })}
    >
      <ConversationView conversationSlug={slug} />
    </HelperClientProvider>
  );
}
