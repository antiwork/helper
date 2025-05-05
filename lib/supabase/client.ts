import { createClient } from "@supabase/supabase-js";
import SuperJSON from "superjson";
import { env } from "../env";

const isTestEnv = process.env.NODE_ENV === 'test';
let supabaseClient;

if (isTestEnv) {
  const mockChannel = {
    send: async () => Promise.resolve(),
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  };
  
  supabaseClient = {
    channel: () => mockChannel,
  };
} else {
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export const supabase = supabaseClient;

const SUPABASE_MAX_PAYLOAD_SIZE = 65536 - 3000;

export const publishToSupabase = async <Data>({
  channel,
  event,
  data,
  trim,
}: {
  channel: string;
  event: string;
  data: Data;
  trim?: (data: Data, count: number) => Data;
}) => {
  let payload = SuperJSON.stringify(data);
  if (payload.length > SUPABASE_MAX_PAYLOAD_SIZE && trim) {
    payload = SuperJSON.stringify(trim(data, payload.length - SUPABASE_MAX_PAYLOAD_SIZE));
  }
  if (payload.length > SUPABASE_MAX_PAYLOAD_SIZE) {
    throw new Error(`${channel} ${event} payload is too large for Supabase: ${payload.length} bytes`);
  }
  
  await supabase.channel(channel).send({
    type: 'broadcast',
    event: event,
    payload: payload,
  });
};
