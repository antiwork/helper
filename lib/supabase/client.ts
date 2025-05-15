import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let globalClient: SupabaseClient | null = null;

export const createClient = () => {
  if (!globalClient) {
    globalClient = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return globalClient;
};
