import { createServerClient } from "@supabase/ssr";
import { createClient as createBaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Agent, setGlobalDispatcher } from "undici";
import { env } from "@/lib/env";

// mkcert doesn't necessarily make Node.js trust the local CA, so we disable SSL verification for fetch() in development
if (env.NODE_ENV === "development") {
  const agent = new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  });
  setGlobalDispatcher(agent);
}

export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};

export const createAdminClient = () => createBaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
