import Link from "next/link";
import { HelperWidgetScript, type HelperWidgetConfig } from "@helperai/react";
import { generateHelperAuth } from "@helperai/react/auth";
import { getBaseUrl } from "@/components/constants";
import { env } from "@/lib/env";
import { AppLayout } from "./appLayout";
import { WidgetButtons } from "./widgetButtons";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== env.NEXT_PUBLIC_DEV_HOST) {
    return <div>Only available in development</div>;
  }

  const { email, isVip, anonymous } = await searchParams;

  const helperAuth = anonymous ? {} : generateHelperAuth({ email: email ?? "test@example.com" });

  const config: HelperWidgetConfig = {
    ...helperAuth,
    title: "Support & Help",
    experimentalReadPage: false,
    enableGuide: true,
    customerMetadata: anonymous
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
    <div className="flex min-h-screen flex-col items-center bg-white p-4">
      <HelperWidgetScript host={env.NEXT_PUBLIC_DEV_HOST} {...config} />
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
  );
}
