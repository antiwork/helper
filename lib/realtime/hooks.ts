import * as Sentry from "@sentry/nextjs";
import { REALTIME_SUBSCRIBE_STATES, RealtimeChannel } from "@supabase/supabase-js";
import { uniqBy } from "lodash-es";
import { useCallback, useEffect, useState } from "react";
import SuperJSON from "superjson";
import { useRefToLatest } from "@/components/useRefToLatest";
import { useSession } from "@/components/useSession";
import { getFullName } from "@/lib/auth/authUtils";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const DISABLED = Symbol("DISABLED");

const channels: Record<
  string,
  {
    channel: RealtimeChannel;
    eventListeners: Record<string, ((payload: { id: string; data: any }) => void)[]>;
  }
> = {};

// Workaround to ensure that the auth token is set correctly for the realtime client (otherwise we can't subscribe to private channels)
const setAuth = () => supabase.realtime.setAuth();
export const ensureRealtimeAuth = setAuth();

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const listenToRealtimeEvent = async <Data = any>(
  channel: { name: string; private: boolean } | typeof DISABLED,
  event: string,
  callback: (message: { id: string; data: Data }) => void,
): Promise<() => void> => {
  if (channel === DISABLED) return () => {};

  await ensureRealtimeAuth;

  let channelObject = channels[channel.name];
  if (!channelObject) {
    channelObject = {
      channel: supabase.channel(channel.name, { config: { private: channel.private } }),
      eventListeners: {},
    };
    channels[channel.name] = channelObject;
    channelObject.channel.subscribe();
  }

  if (!channelObject.eventListeners[event]) {
    channelObject.eventListeners[event] = [];
    channelObject.channel.on("broadcast", { event }, ({ payload }) => {
      if (!payload.data) {
        Sentry.captureMessage("No data in realtime event", {
          level: "warning",
          extra: { channel, event },
        });
        return;
      }
      const data = SuperJSON.parse(payload.data);
      if (env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("Received realtime event:", channel, event, { ...payload, data });
      }
      channelObject.eventListeners[event]?.forEach((listener) =>
        listener({ id: payload.id as string, data: data as Data }),
      );
    });
  }

  const listener = (payload: { id: string; data: any }) => callback(payload);
  channelObject.eventListeners[event].push(listener);

  return () => {
    const channelObject = channels[channel.name];
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
        delete channels[channel.name];
      }
    }
  };
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useRealtimeEvent = <Data = any>(
  channel: { name: string; private: boolean } | typeof DISABLED,
  event: string,
  callback: (message: { id: string; data: Data }) => void,
) => {
  const callbackRef = useRefToLatest(callback);

  useEffect(() => {
    const unlisten = listenToRealtimeEvent(channel, event, (message) => callbackRef.current(message));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [channel === DISABLED ? undefined : channel.name, channel === DISABLED ? undefined : channel.private, event]);
};

// This ensures that the callback is only called once regardless of how many instances of the component exist.
// Useful for events that trigger tRPC data updates.
const handledOneTimeMessageIds = new Set();
export const useRealtimeEventOnce: typeof useRealtimeEvent = (channel, event, callback) => {
  useRealtimeEvent(channel, event, (message) => {
    if (handledOneTimeMessageIds.has(message.id)) {
      return;
    }
    handledOneTimeMessageIds.add(message.id);
    callback(message);
  });
};

export const broadcastRealtimeEvent = async (channel: { name: string; private: boolean }, event: string, data: any) => {
  await ensureRealtimeAuth;
  const serializedData = SuperJSON.stringify(data);
  return supabase.channel(channel.name, { config: { private: channel.private } }).send({
    type: "broadcast",
    event,
    payload: { data: serializedData },
  });
};

export const useBroadcastRealtimeEvent = () => {
  return broadcastRealtimeEvent;
};

export const useRealtimePresence = (channel: { name: string; private: boolean }) => {
  const { user } = useSession() ?? {};
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    await ensureRealtimeAuth;
    const room = supabase.channel(channel.name, { config: { private: channel.private } });
    room
      .on("presence", { event: "sync" }, () => {
        const newState = room.presenceState<{ id: string; name: string }>();
        setUsers(
          uniqBy(
            Object.entries(newState).flatMap(([_, values]) =>
              values[0] ? [{ id: values[0].id, name: values[0].name }] : [],
            ),
            "id",
          ).filter((u) => u.id !== user.id),
        );
      })
      .subscribe(async (status) => {
        if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
        await room.track({ id: user.id, name: getFullName(user) });
      });

    return () => room.unsubscribe();
  }, [user, channel.name, channel.private]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      unsubscribe.then((fn) => fn?.());
    };
  }, [subscribe]);

  return { users };
};
