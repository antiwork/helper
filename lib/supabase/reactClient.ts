import { createClient } from "@supabase/supabase-js";
import { createTRPCQueryUtils } from "@trpc/react-query";
import { env } from "@/lib/env";
import { AppRouter } from "@/trpc/root";

let supabaseClient: { client: ReturnType<typeof createClient>; mailboxSlug: string } | null = null;

export const getGlobalSupabaseClient = (
  mailboxSlug: string,
  utils: ReturnType<typeof createTRPCQueryUtils<AppRouter>>,
) => {
  if (supabaseClient?.mailboxSlug !== mailboxSlug) {
    supabaseClient = {
      client: createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        accessToken: () => utils.user.getSupabaseJWT.fetch(),
      }),
      mailboxSlug,
    };
  }

  return supabaseClient.client;
};
