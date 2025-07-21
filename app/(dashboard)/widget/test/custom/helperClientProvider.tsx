"use client";

import { createContext, useContext, useState } from "react";
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
  const [client] = useState(() => new HelperClient({ host, ...session }));

  return <HelperClientContext.Provider value={{ client }}>{children}</HelperClientContext.Provider>;
};
