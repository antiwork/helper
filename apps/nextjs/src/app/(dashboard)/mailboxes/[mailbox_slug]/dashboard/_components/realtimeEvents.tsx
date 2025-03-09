import {
  CurrencyDollarIcon,
  EnvelopeIcon,
  FlagIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import * as motion from "motion/react-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import HumanizedTime from "@/components/humanizedTime";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  type: "message" | "good_reply" | "bad_reply" | "request_human_support";
  title: string;
  description: string;
  value: number;
  timestamp: Date;
};

type Props = {
  mailboxSlug: string;
};

const EXAMPLE_EVENTS: Event[] = [
  {
    id: "1",
    type: "message",
    title: "New support ticket",
    description: "Customer reported an issue with login",
    value: 100,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: "2",
    type: "good_reply",
    title: "Email sent",
    description: "Response sent to customer inquiry",
    value: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  },
  {
    id: "3",
    type: "bad_reply",
    title: "Email sent",
    description: "Response sent to customer inquiry",
    value: 0,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "4",
    type: "request_human_support",
    title: "Request human support",
    description: "Customer requested human support",
    value: 0,
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
  },
];

export function RealtimeEvents({ mailboxSlug }: Props) {
  const [events, setEvents] = useState<Event[]>(EXAMPLE_EVENTS);

  useEffect(() => {
    const timer = setInterval(() => {
      setEvents((prev) => [
        { ...EXAMPLE_EVENTS[Math.floor(Math.random() * EXAMPLE_EVENTS.length)]!, id: Date.now().toString() },
        ...prev,
      ]);
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  // Listen to new events from Ably
  // useAblyEvent(`${mailboxSlug}:realtime-events`, "new.event", (message) => {
  //   const newEvent = {
  //     ...message.data,
  //     timestamp: new Date(message.data.timestamp),
  //   };
  //   setEvents((prev) => [newEvent, ...prev].slice(0, 12)); // Keep last 12 events
  // });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <motion.div key={event.id} layout>
          <Panel className="p-0">
            <Link
              href={`/mailboxes/${mailboxSlug}/conversations?id=${event.id}`}
              className={cn(
                "flex flex-col p-5 transition-colors hover:bg-muted",
                event.value > 50 && "bg-bright/10 hover:bg-bright/20",
                event.type === "bad_reply" && "bg-destructive/10 hover:bg-destructive/20",
                event.type === "good_reply" && "bg-success/10 hover:bg-success/20",
              )}
            >
              <div className="flex gap-3 mb-2 text-muted-foreground">
                <div className="flex-1 text-sm">test@example.com</div>
                {event.value > 50 && (
                  <div className="flex items-center gap-1 text-xs">
                    <StarIcon className="w-4 h-4 text-bright" />
                    VIP
                  </div>
                )}
                {event.value != null && (
                  <div className="flex items-center gap-1 text-xs">
                    <CurrencyDollarIcon className="w-4 h-4 text-success" />
                    <div>${event.value.toFixed(2)}</div>
                  </div>
                )}
                <Badge variant={event.type === "bad_reply" ? "destructive" : "bright"}>
                  <HumanizedTime time={event.timestamp} format="long" />
                </Badge>
              </div>

              <h3 className="text-lg font-medium truncate">{event.title}</h3>

              {event.type === "bad_reply" ? (
                <div className="mt-6 flex items-center gap-2 text-destructive text-sm">
                  <HandThumbDownIcon className="w-4 h-4" />
                  Bad reply
                </div>
              ) : event.type === "good_reply" ? (
                <div className="mt-6 flex items-center gap-2 text-success text-sm">
                  <HandThumbUpIcon className="w-4 h-4" />
                  Good reply
                </div>
              ) : event.type === "message" ? (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <EnvelopeIcon className="w-4 h-4" />
                  Message
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <FlagIcon className="w-4 h-4" />
                  Request human support
                </div>
              )}
            </Link>
          </Panel>
        </motion.div>
      ))}
      {events.length === 0 && (
        <Panel className="col-span-full text-center py-8 text-muted-foreground">
          No conversations yet. They will appear here in real-time.
        </Panel>
      )}
    </div>
  );
}
