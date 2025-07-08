import * as Sentry from "@sentry/nextjs";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { uniqBy } from "lodash-es";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import { useRefToLatest } from "@/components/useRefToLatest";
import { useSession } from "@/components/useSession";
import { getFullName } from "@/lib/auth/authUtils";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useRealtimeEvent = <Data = any>(
  channel: string,
  event: string,
  callback: (message: { id: string; data: Data }) => void,
) => {
  const callbackRef = useRefToLatest(callback);

  useEffect(() => {
    const listener = supabase.channel(channel).on("broadcast", { event }, (payload) => {
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
      callbackRef.current({ id: payload.id as string, data: data as Data });
    });

    listener.subscribe();
    return () => {
      listener.unsubscribe();
    };
  }, [channel, event]);
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

export const useRealtimePresence = (roomName: string) => {
  const { user } = useSession() ?? {};
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;

    const room = supabase.channel(roomName);
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
        await room.track({ id: user.id, name: getFullName(user.user_metadata?.display_name, user.email) });
      });

    return () => {
      room.unsubscribe();
    };
  }, [user, roomName]);

  return { users };
};
