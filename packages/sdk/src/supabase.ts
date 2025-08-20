import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    HelperSupabase?: {
      client: SupabaseClient;
    };
  }
}

if (!document.currentScript) {
  throw new Error("HelperSupabase must be loaded in a script tag");
}
if (!document.currentScript?.dataset.supabaseUrl || !document.currentScript?.dataset.supabaseAnonKey) {
  throw new Error("HelperSupabase must be loaded with data-supabase-url and data-supabase-anon-key attributes");
}

window.HelperSupabase = {
  client: createClient(document.currentScript.dataset.supabaseUrl, document.currentScript.dataset.supabaseAnonKey),
};
