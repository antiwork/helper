"use client";

import { useCallback, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

export interface CreateSessionParams {
  email?: string | null;
  emailHash?: string | null;
  timestamp?: number | null;
  customerMetadata?: {
    name?: string | null;
    value?: number | null;
    links?: Record<string, string> | null;
  } | null;
  currentToken?: string | null;
}

interface CreateSessionResult {
  token: string;
}

interface UseCreateSessionResult {
  createSession: (params: CreateSessionParams) => Promise<CreateSessionResult>;
  loading: boolean;
  error: string | null;
}

export const createSession = async (host: string, params: CreateSessionParams): Promise<CreateSessionResult> => {
  const response = await fetch(`${host}/api/widget/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

export function useCreateSession(): UseCreateSessionResult {
  const { host } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSessionCallback = useCallback(
    async (params: CreateSessionParams) => {
      try {
        setLoading(true);
        setError(null);

        return await createSession(host, params);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create session";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [host],
  );

  return {
    createSession: createSessionCallback,
    loading,
    error,
  };
}
