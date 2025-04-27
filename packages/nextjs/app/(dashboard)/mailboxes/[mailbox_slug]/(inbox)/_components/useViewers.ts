import { useUser } from "@clerk/nextjs";
import { usePresence, usePresenceListener } from "ably/react";
import { useMemo } from "react";
import { conversationChannelId } from "@/lib/ably/channels";

const useViewers = (mailboxSlug: string, conversationSlug: string) => {
  const { user } = useUser();
  const channel = conversationChannelId(mailboxSlug, conversationSlug);
  usePresence(
    { channelName: channel, skip: !user },
    { id: user?.id, name: user?.fullName ?? user?.emailAddresses[0]?.emailAddress, image: user?.imageUrl },
  );
  const { presenceData } = usePresenceListener<{ id: string; name: string; image: string }>(channel);

  return useMemo(() => {
    const uniqueViewers = new Set<string>();
    return presenceData
      .map(({ data: viewer }) => viewer)
      .filter((viewer) => {
        if (uniqueViewers.has(viewer.id)) return false;
        uniqueViewers.add(viewer.id);
        return viewer.id !== user?.id;
      });
  }, [presenceData, user?.id]);
};

export default useViewers;
