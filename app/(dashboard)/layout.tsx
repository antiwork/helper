import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { StandaloneDisplayIntegration } from "@/app/(dashboard)/standaloneDisplayIntegration";
import { SentryContext } from "@/components/sentryContext";
import { Toaster } from "@/components/ui/toaster";
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
    <ClerkProvider appearance={{ variables: { colorPrimary: "hsl(0 67% 17%)" } }}>
      <NuqsAdapter>
        <Toaster />
        <SentryContext />
        <TRPCReactProvider>
          <StandaloneDisplayIntegration />
          <HydrateClient>{children}</HydrateClient>
        </TRPCReactProvider>
      </NuqsAdapter>
    </ClerkProvider>
  );
}
