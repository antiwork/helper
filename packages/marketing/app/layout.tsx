import { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HelperProvider } from "@helperai/react";
import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider";
import { cn, getBaseUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Helper - AI customer service",
  description: "Helper is an AI customer service agent that helps you handle customer inquiries.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <NuqsAdapter>
        <body className={cn(inter.className, "flex flex-col min-h-screen [&_.prose_a]:no-underline")}>
          <RootProvider>
            <HelperProvider
              host={getBaseUrl().includes("localhost") ? "https://helperai.dev" : "https://help.gumroad.com"}
              mailbox_slug="helper"
            >
              <div className="flex flex-col min-h-screen">{children}</div>
            </HelperProvider>
          </RootProvider>
        </body>
      </NuqsAdapter>
    </html>
  );
}
