import "@/app/globals.css";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HelperProvider } from "@helperai/react";
import { AppSidebar } from "@/app/(dashboard)/appSidebar";
import InboxClientLayout from "@/app/(dashboard)/clientLayout";
import { StandaloneDisplayIntegration } from "@/app/(dashboard)/standaloneDisplayIntegration";
import { SentryContext } from "@/components/sentryContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { TRPCReactProvider } from "@/trpc/react";
import { api, HydrateClient } from "@/trpc/server";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  try {
    await api.mailbox.get();

    return (
      <NuqsAdapter>
        <Toaster richColors />
        <SentryContext />
        <TRPCReactProvider>
          <StandaloneDisplayIntegration />
          <HelperProvider host={env.AUTH_URL} showToggleButton>
            <SidebarProvider>
              <InboxClientLayout>
                <div className="flex h-svh w-full">
                  <AppSidebar />
                  <main className="flex-1 min-w-0">
                    <HydrateClient>{children}</HydrateClient>
                  </main>
                </div>
              </InboxClientLayout>
            </SidebarProvider>
          </HelperProvider>
        </TRPCReactProvider>
      </NuqsAdapter>
    );
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return redirect("/mine");
    }
    throw e;
  }
}
