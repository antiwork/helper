import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Metadata } from "next";
import { HelperProvider } from "@helperai/react";
import { Inter } from "next/font/google";
import "./globals.css";
import { MarketingHeader } from "../components/MarketingHeader";

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
        <body className={inter.className}>
          <HelperProvider
            mailbox_slug={process.env.NEXT_PUBLIC_HELPER_MAILBOX_SLUG || ""}
          >
            <div className="flex flex-col min-h-screen">
              {children}
            </div>
          </HelperProvider>
        </body>
      </NuqsAdapter>
    </html>
  );
}
