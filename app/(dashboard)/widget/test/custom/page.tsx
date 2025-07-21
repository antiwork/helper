import { generateHelperAuth, HelperProvider, type HelperWidgetConfig } from "@helperai/react";
import { CustomWidgetTest } from "@/app/(dashboard)/widget/test/custom/customWidgetTest";
import { getBaseUrl } from "@/components/constants";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== env.HELPER_HOST) {
    return <div>Only available in development</div>;
  }

  const { email, isVip, anonymous } = await searchParams;

  const helperAuth = anonymous ? {} : generateHelperAuth({ email: email ?? "test@example.com" });

  const config: HelperWidgetConfig = {
    ...helperAuth,
    customerMetadata: anonymous
      ? null
      : {
          name: "John Doe",
          value: isVip ? 1000_00 : 100,
          links: {
            "Billing Portal": "https://example.com",
          },
        },
  };

  return (
    <HelperProvider host={env.HELPER_HOST} {...config}>
      <CustomWidgetTest />
    </HelperProvider>
  );
}
