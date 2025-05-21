import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { StandaloneDisplayIntegration } from "@/app/(dashboard)/standaloneDisplayIntegration";
import { SentryContext } from "@/components/sentryContext";
import { Toaster } from "@/components/ui/toaster";
import { TRPCReactProvider } from "@/trpc/react";
import { HydrateClient } from "@/trpc/server";
import { NavigationRail } from "@/components/NavigationRail";

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
  itunes: {
    appId: "6739270977",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "hsl(0 67% 17%)" } }}>
      <NuqsAdapter>
        <Toaster />
        <SentryContext />
        <TRPCReactProvider>
          <StandaloneDisplayIntegration />
          <HydrateClient>
            <div className="flex flex-row min-h-svh w-full">
              <div className="hidden md:block text-sidebar-foreground">
                <NavigationRail />
              </div>
              <main className="flex-1 text-foreground bg-background w-full min-w-0">{children}</main>
            </div>
          </HydrateClient>
        </TRPCReactProvider>
      </NuqsAdapter>
    </ClerkProvider>
  );
}
