import { HelperProvider, type HelperConfig } from "@helperai/react";
import { WidgetButtons } from "../test/WidgetButtons";

export const dynamic = "force-dynamic";

export default function AnonymousWidgetTest() {
  const config: HelperConfig = {
    mailbox_slug: "flexile",
    title: "Anonymous Support",
  };

  return (
    <HelperProvider host="https://helperai.dev" {...config}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <div className="w-full max-w-xl rounded-lg bg-background p-6 shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Helper Anonymous Widget Test Page</h1>
          <p className="mb-4 text-muted-foreground">This page demonstrates the widget in anonymous mode.</p>
          <WidgetButtons />
        </div>
      </div>
    </HelperProvider>
  );
}
