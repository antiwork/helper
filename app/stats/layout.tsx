import "@/app/globals.css";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SentryContext } from "@/components/sentryContext";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/useSession";
import { TRPCReactProvider } from "@/trpc/react";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Helper Stats",
  description: "Ticket count dashboard",
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <Toaster richColors />
      <TRPCReactProvider>
        <SessionProvider>
          <HydrateClient>
            <SentryContext />
            <main className="min-h-screen bg-background p-8">{children}</main>
          </HydrateClient>
        </SessionProvider>
      </TRPCReactProvider>
    </NuqsAdapter>
  );
}
