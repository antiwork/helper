"use client";

import {
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  FlagIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { AblyProvider, ChannelProvider } from "ably/react";
import { BotIcon } from "lucide-react";
import * as motion from "motion/react-client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { getGlobalAblyClient } from "@/components/ablyClient";
import HumanizedTime from "@/components/humanizedTime";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { dashboardChannelId } from "@/lib/ably/channels";
import { useAblyEvent } from "@/lib/ably/hooks";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

const RealtimeEventsContent = ({ mailboxSlug }: { mailboxSlug: string }) => {
  const { ref: loadMoreRef, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = api.mailbox.latestEvents.useInfiniteQuery(
    { mailboxSlug },
    {
      getNextPageParam: (lastPage) => {
        if (!lastPage?.length) return undefined;
        return lastPage[lastPage.length - 1]?.timestamp;
      },
    },
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const utils = api.useUtils();

  const newEventsRef = useRef<RouterOutputs["mailbox"]["latestEvents"]>([]);
  const addNewEvents = useDebouncedCallback(() => {
    utils.mailbox.latestEvents.setInfiniteData({ mailboxSlug }, (data) => {
      const firstPage = data?.pages[0];
      if (!firstPage) return data;
      const eventsToAdd = newEventsRef.current.filter((event) => !firstPage.some((e) => e.id === event.id));
      return {
        ...data,
        pages: [[...eventsToAdd, ...firstPage], ...data.pages.slice(1)],
      };
    });
  }, 5000);

  useAblyEvent(dashboardChannelId(mailboxSlug), "event", (message) => {
    newEventsRef.current = [...newEventsRef.current, message.data];
    addNewEvents();
  });

  const allEvents = data?.pages.flat() ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {allEvents.map((event) => (
        <motion.div key={event.id} layout>
          <Panel
            className={cn(
              "p-0",
              (event.isVip || event.type === "bad_reply" || event.type === "good_reply") && "dark:border-0",
            )}
          >
            <Link
              href={`/mailboxes/${mailboxSlug}/conversations?id=${event.conversationSlug}`}
              className={cn(
                "flex flex-col p-5 transition-colors rounded-lg",
                "hover:bg-muted dark:hover:bg-muted",
                event.isVip && "bg-bright/10 dark:bg-transparent dark:border dark:border-bright/50",
                event.type === "bad_reply" &&
                  "bg-destructive/10 dark:bg-transparent dark:border dark:border-destructive/50",
                event.type === "good_reply" && "bg-success/10 dark:bg-transparent dark:border dark:border-success/50",
              )}
            >
              <div className="flex gap-3 mb-2 text-muted-foreground items-center min-w-0">
                <div className="flex-1 text-sm truncate">{event.emailFrom ?? "Anonymous"}</div>
                <div className="flex items-center gap-3 shrink-0">
                  {event.isVip && (
                    <div className="flex items-center gap-1 text-xs">
                      <StarIcon className="w-4 h-4 text-bright" />
                      VIP
                    </div>
                  )}
                  {event.value != null && (
                    <div className="flex items-center gap-1 text-xs">
                      <CurrencyDollarIcon className="w-4 h-4 text-success" />
                      <div>${(Number(event.value) / 100).toFixed(2)}</div>
                    </div>
                  )}
                  <Badge
                    variant={
                      event.type === "bad_reply" ? "destructive" : event.type === "good_reply" ? "success" : "bright"
                    }
                  >
                    <HumanizedTime time={event.timestamp} format="long" />
                  </Badge>
                </div>
              </div>

              <h3 className="text-lg font-medium truncate">{event.title}</h3>

              {event.type === "bad_reply" ? (
                <div className="mt-6 flex items-center gap-2 text-destructive text-sm">
                  <HandThumbDownIcon className="w-4 h-4" />
                  <span className="flex-1 truncate">
                    Bad reply {event.description ? <>&mdash; {event.description}</> : null}
                  </span>
                </div>
              ) : event.type === "good_reply" ? (
                <div className="mt-6 flex items-center gap-2 text-success text-sm">
                  <HandThumbUpIcon className="w-4 h-4" />
                  Good reply
                </div>
              ) : event.type === "email" ? (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <EnvelopeIcon className="w-4 h-4" />
                  <div className="flex-1 truncate">{event.description}</div>
                </div>
              ) : event.type === "chat" ? (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <div className="flex-1 truncate">{event.description}</div>
                </div>
              ) : event.type === "ai_reply" ? (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <BotIcon strokeWidth={1.5} className="w-4 h-4" />
                  <div className="flex-1 truncate">{event.description}</div>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <FlagIcon className="w-4 h-4 text-bright" />
                  Human support requested
                </div>
              )}
            </Link>
          </Panel>
        </motion.div>
      ))}
      {allEvents.length === 0 && (
        <Panel className="col-span-full text-center py-8 text-muted-foreground">
          No conversations yet. They will appear here in real-time.
        </Panel>
      )}
      <div ref={loadMoreRef} className="col-span-full flex justify-center p-4">
        {isFetchingNextPage && <div className="text-muted-foreground">Loading more events...</div>}
      </div>
    </div>
  );
};

const RealtimeEvents = ({ mailboxSlug }: { mailboxSlug: string }) => {
  return (
    <AblyProvider client={getGlobalAblyClient(mailboxSlug)}>
      <ChannelProvider channelName={dashboardChannelId(mailboxSlug)}>
        <RealtimeEventsContent mailboxSlug={mailboxSlug} />
      </ChannelProvider>
    </AblyProvider>
  );
};

export default RealtimeEvents;
