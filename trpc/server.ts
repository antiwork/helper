import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import { assertDefined } from "@/components/utils/assert";
import { getProfile } from "@/lib/data/user";
import { createClient } from "@/lib/supabase/server";
import { createCaller, createTRPCContext, type AppRouter } from "@/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async (source: string) => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", source);

  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  return createTRPCContext({
    user: user
      ? {
          email: user.email ?? null,
          ...assertDefined(await getProfile(user.id)),
        }
      : null,
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(() => createContext("rsc"));

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(caller, getQueryClient);
