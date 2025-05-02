import * as Ably from "ably";
import { useChannel } from "ably/react";
import { useRef } from "react";
import SuperJSON from "superjson";
import { env } from "@/lib/env";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useAblyEvent = <Data = any>(
  channel: string,
  event: string,
  callback: (message: Omit<Ably.Message, "data"> & { data: Data }) => void,
) => {
  const handledMessageIds = useRef<Set<string>>(new Set());
  useChannel(channel, event, (message) => {
    // Depending on how listeners are set up, this may be called with the same message multiple times.
    if (!message.id || handledMessageIds.current.has(message.id)) {
      if (env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("Already handled Ably event:", channel, event, message);
      }
      return;
    }
    handledMessageIds.current.add(message.id);

    const data = SuperJSON.parse(message.data);
    if (env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("Received Ably event:", channel, event, { ...message, data });
    }
    callback({ ...message, data: data as Data });
  });
};

// This ensures that the callback is only called once regardless of how many instances of the component exist.
// Useful for events that trigger tRPC data updates.
const handledOneTimeMessageIds = new Set();
export const useAblyEventOnce: typeof useAblyEvent = (channel, event, callback) => {
  useAblyEvent(channel, event, (message) => {
    if (handledOneTimeMessageIds.has(message.id)) {
      return;
    }
    handledOneTimeMessageIds.add(message.id);
    callback(message);
  });
};
