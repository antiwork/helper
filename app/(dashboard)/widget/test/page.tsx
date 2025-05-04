import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { generateHelperAuth, HelperProvider, type HelperConfig } from "@helperai/react";
import { AppLayout } from "./appLayout";
import { WidgetButtons } from "./widgetButtons";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  const session = await auth();
  const { email, isVip, anonymous } = await searchParams;

  if (!session) {
    return <div>Not logged in</div>;
  }

  const helperAuth = anonymous ? {} : generateHelperAuth({ email: email ?? "test@example.com" });

  const config: HelperConfig = {
    // eslint-disable-next-line no-restricted-properties
    mailbox_slug: process.env.HELPER_MAILBOX_SLUG!,
    ...helperAuth,
    title: "Support & Help",
    experimental_read_page: false,
    enable_guide: true,
    customer_metadata: anonymous
      ? null
      : {
          name: "John Doe",
          value: isVip ? 1000_00 : 100,
          links: {
            "Billing Portal": "https://example.com",
          },
        },
    theme: {
      background: "#b92d5d",
      foreground: "#ffffff",
      primary: "#ffffff",
      accent: "#feb61b",
    },
  };

  return (
    <HelperProvider host="https://helperai.dev" {...config}>
      <div className="flex min-h-screen flex-col items-center bg-white p-4">
        <div className="my-auto w-full max-w-6xl rounded-lg bg-background p-6 shadow-md">
          <WidgetButtons />

          <div className="mt-8 border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold">Demo App</h2>
            <div className="h-[500px] overflow-hidden rounded border shadow-inner">
              <AppLayout />
            </div>
          </div>
        </div>
        <Link href="/widget/test/vanilla" className="mt-4 text-sm text-muted-foreground hover:underline">
          Vanilla JavaScript Test Page →
        </Link>
      </div>
    </HelperProvider>
  );
}
