"use client";

import React, { createContext, useContext, useState } from "react";
import { HelperClient, SessionParams } from "@helperai/client";
import { env } from "@/lib/env";

const HelperClientContext = createContext<{ client: HelperClient | null } | null>(null);

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
  const [client] = useState(() => {
    if (typeof window === "undefined" || env.NODE_ENV === "test") {
      return null;
    }
    try {
      return new HelperClient({ host, ...session });
    } catch (_error) {
      return null;
    }
  });

  return <HelperClientContext.Provider value={{ client }}>{children}</HelperClientContext.Provider>;
};
