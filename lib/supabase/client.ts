import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

declare global {
  interface Window {
    supabase?: SupabaseClient;
  }
}

let globalClient: SupabaseClient | null = null;

export const createClient = () => {
  if (!globalClient) {
    globalClient = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (typeof window !== "undefined") window.supabase = globalClient;
  }
  return globalClient;
};
