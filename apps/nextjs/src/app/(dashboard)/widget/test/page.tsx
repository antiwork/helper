import { auth } from "@clerk/nextjs/server";
import { generateHelperAuth, HelperProvider, type HelperConfig } from "@helperai/react";
import { AppLayout } from "./_components/AppLayout";
import { WidgetButtons } from "./WidgetButtons";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string }>;
}) {
  const session = await auth();
  const { email, isVip } = await searchParams;

  if (!session) {
    return <div>Not logged in</div>;
  }

  const helperAuth = generateHelperAuth({ email: email ?? "test@example.com" });

  const config: HelperConfig = {
    ...helperAuth,
    title: "Support & Help",
    experimental_read_page: false,
    guide_enabled: true,
    customer_metadata: {
      name: "John Doe",
      value: isVip ? 1000_00 : 100,
      links: {
        "Billing Portal": "https://example.com",
      },
    },
  };

  return (
    <HelperProvider host="https://helperai.dev" {...config}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <div className="w-full max-w-6xl rounded-lg bg-background p-6 shadow-md">
          <WidgetButtons />

          <div className="mt-8 border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold">Demo App</h2>
            <div className="h-[500px] overflow-hidden rounded border shadow-inner">
              <AppLayout />
            </div>
          </div>
        </div>
      </div>
    </HelperProvider>
  );
}
