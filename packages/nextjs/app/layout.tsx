import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import cx from "classnames";
import type { Metadata } from "next";
import { sundryBold, sundryMedium, sundryNarrowBold, sundryNarrowMedium, sundryRegular } from "@/components/fonts";
import { ThemeProvider } from "@/components/themeProvider";

export const metadata: Metadata = {
  title: "Helper",
  description: "AI powered assistant",
  manifest: "/app.webmanifest",
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon.ico",
    },
  ],
};

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
      <body className="h-full antialiased text-foreground bg-background font-regular" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClerkProvider>{children}</ClerkProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
