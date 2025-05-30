import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helper Widget",
  description: "Powered by Helper",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <main className="light">{children}</main>;
}
