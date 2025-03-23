import { auth } from "@clerk/nextjs/server";
import { generateHelperAuth, HelperProvider, type HelperConfig } from "@helperai/react";
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
    experimental_read_page: true,
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
        <div className="w-full max-w-xl rounded-lg bg-background p-6 shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Helper widget Test Page</h1>
          <WidgetButtons />
        </div>
        <div className="text-md text-black mt-4">
          <p className="font-semibold">Sample Flexile page content</p>
          <p className="mt-6">Raphael completed the following tasks last week:</p>
          <ul>
            <li>Created a Gumroad membership product</li>
            <li>Created a PR for Helper Widget</li>
            <li>Created to improve AI response quality</li>
          </ul>
        </div>
      </div>
    </HelperProvider>
  );
}
