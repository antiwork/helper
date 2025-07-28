"use client";

import { useMutation } from "@tanstack/react-query";
import { useHelperClient } from "../components/helperClientProvider";
import type { SessionParams } from "@helperai/client";

export const useCreateSession = () => {
  const client = useHelperClient();
  
  return useMutation({
    mutationFn: (params: SessionParams) => client.sessions.create(params),
  });
};
