import "@/app/globals.css";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { AppSidebar } from "@/app/(dashboard)/appSidebar";
import InboxClientLayout from "@/app/(dashboard)/clientLayout";
import { StandaloneDisplayIntegration } from "@/app/(dashboard)/standaloneDisplayIntegration";
import { SentryContext } from "@/components/sentryContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/useSession";
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
    <NuqsAdapter>
      <Toaster richColors />
      <TRPCReactProvider>
        <SessionProvider>
          <StandaloneDisplayIntegration />
          <HydrateClient>
            <SentryContext />
            <SidebarProvider>
              <InboxClientLayout>
                <div className="flex h-svh w-full">
                  <Suspense>
                    <AppSidebar />
                  </Suspense>
                  <main className="flex-1 min-w-0">{children}</main>
                </div>
              </InboxClientLayout>
            </SidebarProvider>
          </HydrateClient>
        </SessionProvider>
      </TRPCReactProvider>
    </NuqsAdapter>
  );
}
