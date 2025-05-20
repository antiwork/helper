import "@/app/globals.css";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HelperConfig, HelperProvider } from "@helperai/react";
import { SentryContext } from "@/components/sentryContext";
import { env } from "@/lib/env";
import { TRPCReactProvider } from "@/trpc/react";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Helper",
  description: "AI powered assistant",
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon.ico",
    },
  ],
};

export const viewport = { width: "device-width", initialScale: 1 };
const HELPER_MAILBOX_SLUG = "helper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config: HelperConfig = {
    title: "Support",
    icon_color: "#FEB61C",
    mailbox_slug: HELPER_MAILBOX_SLUG,
  };

  return (
    <NuqsAdapter>
      <SentryContext />
      <TRPCReactProvider>
        <HelperProvider host={env.AUTH_URL} {...config}>
          <HydrateClient>{children}</HydrateClient>
        </HelperProvider>
      </TRPCReactProvider>
    </NuqsAdapter>
  );
}
