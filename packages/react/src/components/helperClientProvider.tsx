"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelperClient, SessionParams } from "@helperai/client";

const HelperClientContext = createContext<{ client: HelperClient } | null>(null);

export const useHelperClient = () => {
  const context = useContext(HelperClientContext);
  if (!context) {
    throw new Error("useHelperClient must be used within HelperClientProvider");
  }
  return context.client;
};

export interface HelperClientProviderProps {
  host: string;
  session: SessionParams;
  children: ReactNode;
  queryClient?: QueryClient;
}

export const HelperClientProvider = ({ 
  host, 
  session, 
  children, 
  queryClient 
}: HelperClientProviderProps) => {
  const [client] = useState(() => new HelperClient({ host, ...session }));
  const [defaultQueryClient] = useState(() => new QueryClient());
  
  return (
    <QueryClientProvider client={queryClient || defaultQueryClient}>
      <HelperClientContext.Provider value={{ client }}>
        {children}
      </HelperClientContext.Provider>
    </QueryClientProvider>
  );
};
