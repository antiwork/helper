import * as Ably from "ably";
import { useChannel } from "ably/react";
import SuperJSON from "superjson";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useAblyEvent = <Data = any>(
  channel: string,
  event: string,
  callback: (message: Omit<Ably.Message, "data"> & { data: Data }) => void,
) => {
  useChannel(channel, event, (message) => callback({ ...message, data: SuperJSON.parse(message.data) }));
};
