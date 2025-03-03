import * as React from "react";

export type PageContainerProps = {
  children: React.ReactNode;
};

export const PageContainer = ({ children }: PageContainerProps) => (
  <div className="flex grow flex-col overflow-hidden h-full">{children}</div>
);
