import * as React from "react";
import { cn } from "@/lib/utils";

export type Props = {
  children: React.ReactNode;
  className?: string;
};

export const PageContent = ({ children, className }: Props) => (
  <div className={cn("max-h-screen overflow-y-auto px-4 py-4 pb-4", className)}>{children}</div>
);
