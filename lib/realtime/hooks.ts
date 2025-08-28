import * as Sentry from "@sentry/nextjs";
import { REALTIME_SUBSCRIBE_STATES, RealtimeChannel } from "@supabase/supabase-js";
import { uniqBy } from "lodash-es";
import { useEffect, useState } from "react";
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

const presenceChannels: Record<
  string,
  {
    channel: RealtimeChannel;
    listeners: ((users: { id: string; name: string }[]) => void)[];
    unsubscribeTimeout?: NodeJS.Timeout;
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

export const listenToRealtimePresence = async (
  channel: { name: string; private: boolean } | typeof DISABLED,
  user: { id: string; name: string },
  callback: (users: { id: string; name: string }[]) => void,
): Promise<() => void> => {
  if (channel === DISABLED) return () => {};

  await ensureRealtimeAuth;

  const channelName = `${channel.name}/presence`;

  let presenceChannelObject = presenceChannels[channelName];
  if (!presenceChannelObject) {
    presenceChannelObject = {
      channel: supabase.channel(channelName, { config: { private: channel.private } }),
      listeners: [],
    };
    presenceChannels[channelName] = presenceChannelObject;

    presenceChannelObject.channel
      .on("presence", { event: "sync" }, () => {
        const channelObj = presenceChannels[channelName];
        if (!channelObj) return;

        const newState = channelObj.channel.presenceState<{ id: string; name: string }>();
        const users = uniqBy(
          Object.entries(newState).flatMap(([_, values]) =>
            values[0] ? [{ id: values[0].id, name: values[0].name }] : [],
          ),
          "id",
        ).filter((u) => u.id !== user.id);

        channelObj.listeners.forEach((listener) => listener(users));
      })
      .subscribe(async (status) => {
        if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
        const channelObj = presenceChannels[channelName];
        // Assume the user is always the same if there are multiple components listening (it should always be the current user)
        await channelObj?.channel.track({ id: user.id, name: user.name });
      });
  }

  if (presenceChannelObject.unsubscribeTimeout) {
    clearTimeout(presenceChannelObject.unsubscribeTimeout);
    presenceChannelObject.unsubscribeTimeout = undefined;
  }

  presenceChannelObject.listeners.push(callback);

  return () => {
    const presenceChannelObject = presenceChannels[channelName];
    if (!presenceChannelObject) return;
    const index = presenceChannelObject.listeners.indexOf(callback);
    if (index >= 0) presenceChannelObject.listeners.splice(index, 1);

    if (presenceChannelObject.listeners.length === 0) {
      // Delay unsubscribe so that we don't send repeated join/leave events if a component re-renders
      presenceChannelObject.unsubscribeTimeout = setTimeout(() => {
        if (presenceChannelObject.listeners.length === 0) {
          presenceChannelObject.channel.unsubscribe();
          delete presenceChannels[channelName];
        }
      }, 100);
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
  const usersCallbackRef = useRefToLatest((users: { id: string; name: string }[]) => setUsers(users));

  useEffect(() => {
    if (!user) return;

    const userWithName = { id: user.id, name: getFullName(user) };
    const unlisten = listenToRealtimePresence(channel, userWithName, (users) => usersCallbackRef.current(users));

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [user?.id, channel.name, channel.private]);

  return { users };
};
