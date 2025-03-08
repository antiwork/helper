import { useState } from "react";
import HumanizedTime from "@/components/humanizedTime";
import { Panel } from "@/components/panel";
import { useAblyEvent } from "@/lib/ably/hooks";

type Event = {
  id: string;
  type: "ticket" | "event";
  title: string;
  description: string;
  timestamp: Date;
};

type Props = {
  mailboxSlug: string;
};

export function RealtimeEvents({ mailboxSlug }: Props) {
  const [events, setEvents] = useState<Event[]>([]);

  // Listen to new events from Ably
  useAblyEvent(`${mailboxSlug}:realtime-events`, "new.event", (message) => {
    const newEvent = {
      ...message.data,
      timestamp: new Date(message.data.timestamp),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 12)); // Keep last 12 events
  });

  return (
    <Panel>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-card p-4 rounded-lg border border-border hover:border-border/60 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm">{event.title}</h4>
                <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                <HumanizedTime time={event.timestamp} />
              </span>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No events yet. They will appear here in real-time.
          </div>
        )}
      </div>
    </Panel>
  );
}
