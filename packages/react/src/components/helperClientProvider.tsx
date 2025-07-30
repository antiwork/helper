"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { HelperClient, SessionParams } from "@helperai/client";

const HelperClientContext = createContext<{ client: HelperClient; queryClient: QueryClient } | null>(null);

let globalQueryClient: QueryClient | null = null;

const getGlobalQueryClient = () => {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient();
  }
  return globalQueryClient;
};

export const useHelperClient = () => {
  const context = useContext(HelperClientContext);
  if (!context) {
    throw new Error("useHelperClient must be used within HelperClientProvider");
  }
  return context;
};

export interface HelperClientProviderProps {
  host: string;
  session: SessionParams;
  children: ReactNode;
  queryClient?: QueryClient;
}

export const HelperClientProvider = ({ host, session, children, queryClient }: HelperClientProviderProps) => {
  const client = useMemo(() => new HelperClient({ host, ...session }), [host, JSON.stringify(session)]);
  const sharedQueryClient = queryClient || getGlobalQueryClient();

  return (
    <QueryClientProvider client={sharedQueryClient}>
      <HelperClientContext.Provider value={{ client, queryClient: sharedQueryClient }}>
        {children}
      </HelperClientContext.Provider>
    </QueryClientProvider>
  );
};
