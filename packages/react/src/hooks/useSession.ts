"use client";

import { useMutation } from "@tanstack/react-query";
import type { SessionParams } from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export const useCreateSession = () => {
  const client = useHelperClient();

  return useMutation({
    mutationFn: (params: SessionParams) => client.sessions.create(params),
  });
};
