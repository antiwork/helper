"use client";

import React, { createContext, useContext, useMemo } from "react";
import { HelperClient, SessionParams } from "@helperai/client";

const HelperClientContext = createContext<{ client: HelperClient } | null>(null);

export const useHelperClientContext = () => {
  const context = useContext(HelperClientContext);
  if (!context) {
    throw new Error("useHelperClientContext must be used within HelperClientProvider");
  }
  return context;
};

export interface HelperClientProviderProps {
  host: string;
  session: SessionParams;
  children: React.ReactNode;
}

export const HelperClientProvider = ({ host, session, children }: HelperClientProviderProps) => {
  const client = useMemo(() => new HelperClient({ host, ...session }), [host, session]);
  return <HelperClientContext.Provider value={{ client }}>{children}</HelperClientContext.Provider>;
};
