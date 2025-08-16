import { HelperWidgetScript, type HelperWidgetConfig } from "@helperai/react";
import { env } from "@/lib/env";
import { WidgetButtons } from "../test/widgetButtons";

export const dynamic = "force-dynamic";

export default function AnonymousWidgetTest() {
  const config: HelperWidgetConfig = {
    title: "Anonymous Support & Help",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <HelperWidgetScript host={env.NEXT_PUBLIC_DEV_HOST} {...config} />
      <div className="w-full max-w-xl rounded-lg bg-background p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Helper Anonymous Widget Test Page</h1>
        <p className="mb-4 text-muted-foreground">This page demonstrates the widget in anonymous mode.</p>
        <WidgetButtons />
      </div>
    </div>
  );
}
