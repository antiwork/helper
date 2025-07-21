"use client";

import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { HelperClient, SessionParams } from "@helperai/client";

interface HelperContextValue {
  client: HelperClient;
}

const HelperContext = createContext<HelperContextValue | null>(null);

export interface HelperContextProviderProps extends SessionParams {
  children: ReactNode;
  host: string;
}

export function HelperContextProvider({ children, ...params }: HelperContextProviderProps) {
  const value: HelperContextValue = useMemo(() => ({ client: new HelperClient(params) }), [params]);

  return <HelperContext.Provider value={value}>{children}</HelperContext.Provider>;
}

export function useHelperContext() {
  const context = useContext(HelperContext);
  if (!context) {
    throw new Error("useHelperContext must be used within a HelperContextProvider");
  }
  return context;
}
