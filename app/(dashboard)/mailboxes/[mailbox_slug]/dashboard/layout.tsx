import React from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-col h-dvh text-foreground w-full bg-sidebar">
      {children}
    </main>
  );
}

export default DashboardLayout;
