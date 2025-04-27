import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/docs/layout.config";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh">
      <RootProvider search={{ options: { api: "/docs/api/search" } }}>
        <DocsLayout tree={source.pageTree} {...baseOptions}>
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  );
}
