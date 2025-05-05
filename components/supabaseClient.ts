import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env";

const isTestEnv = process.env.NODE_ENV === 'test';

const createMockClient = () => {
  const mockChannel = {
    send: async () => Promise.resolve(),
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  };
  
  return {
    channel: () => mockChannel,
  };
};

let supabaseClient: { client: ReturnType<typeof createClient> | any; mailboxSlug: string } | null = null;

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
