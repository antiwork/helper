import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import cx from "classnames";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HelperConfig, HelperProvider } from "@helperai/react";
import { SentryContext } from "@/components/sentryContext";
import { ThemeProvider } from "@/components/themeProvider";
import { env } from "@/env";
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

  const helperHost = env.NODE_ENV === "development" ? "https://helperai.dev" : undefined;

  return (
    <html lang="en" suppressHydrationWarning className={cx("h-full")}>
      <body className="h-full antialiased text-foreground bg-background">
        <ClerkProvider appearance={{ variables: { colorPrimary: "hsl(0 67% 17%)" } }}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NuqsAdapter>
              <SentryContext />
              <TRPCReactProvider>
                <HelperProvider host={helperHost} {...config}>
                  <HydrateClient>{children}</HydrateClient>
                </HelperProvider>
              </TRPCReactProvider>
            </NuqsAdapter>
          </ThemeProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
