"use client";

import React, { createContext, ReactNode, useContext, useMemo, useRef } from "react";
import { createSession, CreateSessionParams } from "../hooks/useCreateSession";

interface HelperContextValue {
  host: string;
  getToken: () => Promise<string>;
}

const HelperContext = createContext<HelperContextValue | null>(null);

export interface HelperContextProviderProps extends CreateSessionParams {
  children: ReactNode;
  host: string;
}

export function HelperContextProvider({ children, host, ...params }: HelperContextProviderProps) {
  const tokenRef = useRef<string | null>(null);

  const value: HelperContextValue = useMemo(
    () => ({
      host,
      getToken: async () => {
        if (!tokenRef.current) {
          const { token: newToken } = await createSession(host, params);
          tokenRef.current = newToken;
        }
        return tokenRef.current;
      },
    }),
    [host, params],
  );

  return <HelperContext.Provider value={value}>{children}</HelperContext.Provider>;
}

export function useHelperContext() {
  const context = useContext(HelperContext);
  if (!context) {
    throw new Error("useHelperContext must be used within a HelperContextProvider");
  }
  return context;
}
