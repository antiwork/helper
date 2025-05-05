import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import SuperJSON from "superjson";
import { env } from "../env";
import { supabase } from "./client";

type SupabaseContextType = {
  supabase: typeof supabase;
};

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  return <SupabaseContext.Provider value={{ supabase }}>{children}</SupabaseContext.Provider>;
};

type ChannelContextType = {
  channel: RealtimeChannel;
};

const ChannelContext = createContext<ChannelContextType | null>(null);

export const ChannelProvider = ({
  channelName,
  children,
}: {
  channelName: string;
  children: ReactNode;
}) => {
  const [channel] = useState(() => 
    supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    }).subscribe()
  );

  useEffect(() => {
    return () => {
      channel.unsubscribe();
    };
  }, [channel]);

  return <ChannelContext.Provider value={{ channel }}>{children}</ChannelContext.Provider>;
};

export const useSupabaseEvent = <Data = unknown>(
  channelName: string,
  eventName: string,
  callback: (message: { id: string; data: Data; event: string; timestamp: number }) => void,
) => {
  const handledMessageIds = useRef<Set<string>>(new Set());
  const [channel] = useState(() => 
    supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    })
  );

  useEffect(() => {
    const subscription = channel
      .on('broadcast', { event: eventName }, (message) => {
        const messageId = message.eventId || `${Date.now()}-${Math.random()}`;
        
        if (handledMessageIds.current.has(messageId)) {
          return;
        }
        handledMessageIds.current.add(messageId);

        const data = SuperJSON.parse(message.payload);
        
        callback({
          id: messageId,
          data: data as Data,
          event: message.event,
          timestamp: message.timestamp || Date.now(),
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelName, eventName, callback]);
};

const handledOneTimeMessageIds = new Set();
export const useSupabaseEventOnce = <Data,>(
  channelName: string,
  eventName: string,
  callback: (message: { id: string; data: Data; event: string; timestamp: number }) => void,
) => {
  useSupabaseEvent<Data>(channelName, eventName, (message) => {
    if (handledOneTimeMessageIds.has(message.id)) {
      return;
    }
    handledOneTimeMessageIds.add(message.id);
    callback(message);
  });
};
