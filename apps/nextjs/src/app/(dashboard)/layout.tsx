import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import cx from "classnames";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DeepLinkHandler } from "@/components/deepLinkHandler";
import { sundryBold, sundryMedium, sundryNarrowBold, sundryNarrowMedium, sundryRegular } from "@/components/fonts";
import { NativeLinkOpener } from "@/components/nativeLinkOpener";
import { SentryContext } from "@/components/sentryContext";
import { TauriUpdateChecker } from "@/components/tauriUpdateChecker";
import { ThemeProvider } from "@/components/themeProvider";
import { Toaster } from "@/components/ui/toaster";
import { TRPCReactProvider } from "@/trpc/react";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Helper",
  description: "AI powered assistant",
  manifest: "/manifest.json",
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon.ico",
      media: "(prefers-color-scheme: light)",
    },
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon_dark.ico",
      media: "(prefers-color-scheme: dark)",
    },
  ],
  itunes: {
    appId: "6739270977",
  },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cx(
        "h-full",
        sundryRegular.variable,
        sundryMedium.variable,
        sundryBold.variable,
        sundryNarrowMedium.variable,
        sundryNarrowBold.variable,
      )}
    >
      <body className="h-full overflow-y-hidden antialiased text-foreground bg-background font-regular">
        <ClerkProvider appearance={{ variables: { colorPrimary: "hsl(0 67% 17%)" } }}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NuqsAdapter>
              <Toaster />
              <SentryContext />
              <TRPCReactProvider>
                <HydrateClient>
                  <TauriUpdateChecker />
                  <NativeLinkOpener />
                  <DeepLinkHandler />
                  {children}
                </HydrateClient>
              </TRPCReactProvider>
            </NuqsAdapter>
          </ThemeProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
