import { api } from "@/trpc/react";

export const useMembers = () =>
  api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
