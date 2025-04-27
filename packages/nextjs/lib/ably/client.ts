import Ably from "ably";
import SuperJSON from "superjson";
import { env } from "@/env";

const ably = new Ably.Rest(env.ABLY_API_KEY);

// Ably's serialization overhead means messages can slightly overflow the 64KB limit,
// so we subtract a few KB to be safe.
const ABLY_MAX_PAYLOAD_SIZE = 65536 - 3000;

export const publishToAbly = async <Data>({
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
  if (payload.length > ABLY_MAX_PAYLOAD_SIZE && trim) {
    payload = SuperJSON.stringify(trim(data, payload.length - ABLY_MAX_PAYLOAD_SIZE));
  }
  if (payload.length > ABLY_MAX_PAYLOAD_SIZE) {
    throw new Error(`${channel} ${event} payload is too large for Ably: ${payload.length} bytes`);
  }
  await ably.channels.get(channel).publish(event, payload);
};
