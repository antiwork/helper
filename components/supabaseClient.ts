import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env";

const isTestEnv = env.NODE_ENV === 'test';

const createMockClient = () => {
  const mockChannel = {
    send: () => Promise.resolve(),
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  };
  
  return {
    channel: () => mockChannel,
  };
};

let supabaseClient: { client: ReturnType<typeof createClient> | Record<string, unknown>; mailboxSlug: string } | null = null;

export const getGlobalSupabaseClient = (mailboxSlug: string) => {
  if (supabaseClient?.mailboxSlug !== mailboxSlug) {
    supabaseClient = {
      client: isTestEnv 
        ? createMockClient()
        : createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
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
