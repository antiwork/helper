"use client";

import { useCallback, useState } from "react";
import { CreateSessionParams, CreateSessionResult } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

interface UseCreateSessionResult {
  createSession: (params: CreateSessionParams) => Promise<CreateSessionResult>;
  loading: boolean;
  error: string | null;
}

export function useCreateSession(): UseCreateSessionResult {
  const { client } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSessionCallback = useCallback(
    async (params: CreateSessionParams) => {
      try {
        setLoading(true);
        setError(null);

        return await client.sessions.create(params);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create session";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return {
    createSession: createSessionCallback,
    loading,
    error,
  };
}
