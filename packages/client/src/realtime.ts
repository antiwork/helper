import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import SuperJSON from "superjson";

const channels: Record<
  string,
  {
    channel: RealtimeChannel;
    eventListeners: Record<string, ((payload: { id: string; data: any }) => void)[]>;
  }
> = {};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const listenToRealtimeEvent = <Data = any>(
  supabase: SupabaseClient,
  channel: string,
  event: string,
  callback: (message: { id: string; data: Data }) => void,
): (() => void) => {
  let channelObject = channels[channel];
  if (!channelObject) {
    channelObject = {
      channel: supabase.channel(channel),
      eventListeners: {},
    };
    channels[channel] = channelObject;
    channelObject.channel.subscribe();
  }

  if (!channelObject.eventListeners[event]) {
    channelObject.eventListeners[event] = [];
    channelObject.channel.on("broadcast", { event }, ({ payload }) => {
      if (!payload.data) {
        console.warn("No data in realtime event", { channel, event });
        return;
      }
      const data = SuperJSON.parse(payload.data);
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(
          "Helper received realtime event (this message will not be shown in production):",
          channel,
          event,
          { ...payload, data },
        );
      }
      channelObject.eventListeners[event]?.forEach((listener) =>
        listener({ id: payload.id as string, data: data as Data }),
      );
    });
  }

  const listener = (payload: { id: string; data: any }) => callback(payload);
  channelObject.eventListeners[event].push(listener);

  return () => {
    const channelObject = channels[channel];
    if (channelObject) {
      const index = channelObject.eventListeners[event]?.indexOf(listener);

      if (index != null && index >= 0) {
        channelObject.eventListeners[event]!.splice(index, 1);
      }

      if (channelObject.eventListeners[event]!.length === 0) {
        delete channelObject.eventListeners[event];
      }

      if (Object.keys(channelObject.eventListeners).length === 0) {
        supabase.removeChannel(channelObject.channel);
        delete channels[channel];
      }
    }
  };
};
