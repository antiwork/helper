import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env";

let supabaseClient: { client: ReturnType<typeof createClient>; mailboxSlug: string } | null = null;

export const getGlobalSupabaseClient = (mailboxSlug: string) => {
  if (supabaseClient?.mailboxSlug !== mailboxSlug) {
    const oldClient = supabaseClient?.client;
    supabaseClient = {
      client: createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
        },
        realtime: {
          params: {
            mailboxSlug: mailboxSlug,
          },
        },
      }),
      mailboxSlug,
    };
    
  }
  
  return supabaseClient.client;
};
