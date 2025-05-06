import { useUser } from "@clerk/nextjs";
import { useMemo, useEffect, useState } from "react";
import { conversationChannelId } from "@/lib/supabase/channels";
import { supabase } from "@/lib/supabase/serverClient";

const useViewers = (mailboxSlug: string, conversationSlug: string) => {
  const { user } = useUser();
  const channel = conversationChannelId(mailboxSlug, conversationSlug);
  const [presenceData, setPresenceData] = useState<Array<{ id: string; name: string; image: string }>>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const presenceChannel = supabase.channel(`presence-${channel}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const viewers = Object.values(state).flatMap(presenceState => 
          presenceState.map((presence: any) => presence.payload)
        );
        setPresenceData(viewers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceData(prev => [...prev, ...newPresences.map((p: any) => p.payload)]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setPresenceData(prev => 
          prev.filter(viewer => !leftPresences.some((p: any) => p.payload.id === viewer.id))
        );
      });
    
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          id: user.id,
          name: user.fullName ?? user.emailAddresses[0]?.emailAddress,
          image: user.imageUrl,
        });
      }
    });
    
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user, channel]);

  return useMemo(() => {
    const uniqueViewers = new Set<string>();
    return presenceData
      .filter((viewer) => {
        if (uniqueViewers.has(viewer.id)) return false;
        uniqueViewers.add(viewer.id);
        return viewer.id !== user?.id;
      });
  }, [presenceData, user?.id]);
};

export default useViewers;
