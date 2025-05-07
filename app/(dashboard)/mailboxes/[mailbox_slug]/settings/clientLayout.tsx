"use client";

import { type ReactNode } from "react";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <main className="flex flex-col h-dvh text-foreground w-full">{children}</main>;
}
