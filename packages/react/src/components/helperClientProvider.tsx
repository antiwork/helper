"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { HelperClient, SessionParams } from "@helperai/client";

const HelperClientContext = createContext<{ client: HelperClient; queryClient: QueryClient } | null>(null);

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
  const client = useMemo(() => new HelperClient({ host, ...session }), [host, session]);
  const [defaultQueryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient || defaultQueryClient}>
      <HelperClientContext.Provider value={{ client, queryClient: queryClient || defaultQueryClient }}>
        {children}
      </HelperClientContext.Provider>
    </QueryClientProvider>
  );
};
