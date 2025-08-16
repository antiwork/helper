import { HelperClientProvider } from "@helperai/react";
import { CustomWidgetTest } from "@/app/(dashboard)/widget/test/custom/customWidgetTest";
import { generateSession } from "@/app/(dashboard)/widget/test/custom/generateSession";
import { getBaseUrl } from "@/components/constants";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== env.NEXT_PUBLIC_DEV_HOST) {
    return <div>Only available in development</div>;
  }

  return (
    <HelperClientProvider host={env.NEXT_PUBLIC_DEV_HOST} session={generateSession(await searchParams)}>
      <CustomWidgetTest />
    </HelperClientProvider>
  );
}
