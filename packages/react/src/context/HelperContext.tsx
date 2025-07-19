"use client";

import React, { createContext, ReactNode, useContext, useMemo, useRef } from "react";
import { CreateSessionParams, HelperClient } from "@helperai/client";

interface HelperContextValue {
  host: string;
  getToken: () => Promise<string>;
  client: HelperClient;
}

const HelperContext = createContext<HelperContextValue | null>(null);

export interface HelperContextProviderProps extends CreateSessionParams {
  children: ReactNode;
  host: string;
}

export function HelperContextProvider({ children, host, ...params }: HelperContextProviderProps) {
  const tokenRef = useRef<string | null>(null);

  const value: HelperContextValue = useMemo(() => {
    const getToken = async (): Promise<string> => {
      if (!tokenRef.current) {
        const client = new HelperClient(host, () => Promise.resolve(""));
        const { token: newToken } = await client.sessions.create(params);
        tokenRef.current = newToken;
      }
      return tokenRef.current!;
    };

    const client = new HelperClient(host, getToken);

    return {
      host,
      getToken,
      client,
    };
  }, [host, params]);

  return <HelperContext.Provider value={value}>{children}</HelperContext.Provider>;
}

export function useHelperContext() {
  const context = useContext(HelperContext);
  if (!context) {
    throw new Error("useHelperContext must be used within a HelperContextProvider");
  }
  return context;
}
