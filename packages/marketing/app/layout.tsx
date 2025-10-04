import { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Helper - AI customer service",
  description: "Helper is an AI customer service agent that helps you handle customer inquiries.",
  openGraph: {
    title: "Helper - AI customer service",
    description: "Helper is an AI customer service agent that helps you handle customer inquiries.",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Helper - AI customer service",
      },
    ],
  },
  twitter: {
    title: "Helper - AI Customer Service Platform",
    description: "Helper is an AI customer service agent that helps you handle customer inquiries.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Helper - AI customer service",
      },
    ],
  },
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
        <body className={cn(inter.className, "flex flex-col min-h-screen [&_.prose_a[href^='#']]:no-underline")}>
          <RootProvider>
            <div className="flex flex-col min-h-screen">{children}</div>
          </RootProvider>
        </body>
      </NuqsAdapter>
    </html>
  );
}
