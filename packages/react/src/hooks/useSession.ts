"use client";

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import type { SessionParams } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export const useCreateSession = (mutationOptions?: Partial<UseMutationOptions<any, Error, SessionParams>>) => {
  const { client } = useHelperClient();

  return useMutation({
    mutationFn: (params: SessionParams) => client.sessions.create(params),
    ...mutationOptions,
  });
};
