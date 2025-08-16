import SuperJSON from "superjson";
import { createAdminClient } from "@/lib/supabase/server";

// Supabase's limit is 250KB but we subtract some to cover the extra bytes added by SuperJSON
const MAX_PAYLOAD_SIZE = 200 * 1000;

export const publishToRealtime = async <Data>({
  channel,
  event,
  data,
  trim,
}: {
  channel: { name: string; private: boolean };
  event: string;
  data: Data;
  trim?: (data: Data, count: number) => Data;
}) => {
  let json = SuperJSON.stringify(data);
  if (json.length > MAX_PAYLOAD_SIZE && trim) {
    json = SuperJSON.stringify(trim(data, json.length - MAX_PAYLOAD_SIZE));
  }
  if (json.length > MAX_PAYLOAD_SIZE) {
    throw new Error(`${channel.name} ${event} payload is too large for realtime: ${json.length} bytes`);
  }
  await createAdminClient()
    .channel(channel.name, { config: { private: channel.private } })
    .send({
      type: "broadcast",
      event,
      payload: { id: crypto.randomUUID(), data: json },
    });
};
