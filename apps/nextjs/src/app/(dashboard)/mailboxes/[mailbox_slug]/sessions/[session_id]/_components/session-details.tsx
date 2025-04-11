"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { guideSessionReplays } from "@/db/schema";
import { GuideSession, GuideSessionEvent } from "@/lib/data/guide";
import { RouterOutputs } from "@/trpc";

type MailboxData = RouterOutputs["mailbox"]["get"];
type ReplayEvent = typeof guideSessionReplays.$inferSelect;
type RRWebEvent = {
  type: number;
  data: any;
  timestamp: number;
};

interface SessionDetailsProps {
  mailbox: MailboxData;
  session: GuideSession & {
    events: GuideSessionEvent[];
  };
  replayEvents: ReplayEvent[];
}

export default function SessionDetails({ mailbox, session, replayEvents }: SessionDetailsProps) {
  const router = useRouter();

  // State for rrweb player
  const [isReplayReady, setIsReplayReady] = useState(false);
  const [rrwebEvents, setRrwebEvents] = useState<RRWebEvent[]>([]);
  const [isReplayLoading, setIsReplayLoading] = useState(true);
  const [replayError, setReplayError] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const eventIcons: Record<string, React.ReactNode> = {
    session_started: "🚀",
    status_changed: "🔄",
    step_added: "➕",
    step_completed: "✅",
    step_updated: "📝",
    completed: "🏁",
    abandoned: "🛑",
    paused: "⏸️",
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "abandoned":
        return "destructive";
      case "paused":
        return "default";
      default:
        return "default";
    }
  };

  const formatEventData = (event: GuideSessionEvent) => {
    try {
      if (!event.data) return null;

      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      return (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details">
            <AccordionTrigger>View Event Details</AccordionTrigger>
            <AccordionContent>
              <pre className="p-4 rounded-md overflow-auto text-sm">{JSON.stringify(data, null, 2)}</pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    } catch (error) {
      return <p className="text-destructive">Error parsing event data</p>;
    }
  };

  const handleViewReplay = () => {
    router.push(`/mailboxes/${mailbox.slug}/sessions/${session.id}/replay`);
  };

  // Effect to process replay events
  useEffect(() => {
    if (replayEvents.length === 0) {
      setReplayError("No replay events found for this session");
      setIsReplayLoading(false);
      return;
    }

    try {
      // Convert stored events to format expected by rrweb player
      const formattedEvents = replayEvents
        .map((event) => {
          const parsedData = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          return {
            ...parsedData,
            timestamp: new Date(event.timestamp).getTime(),
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      setRrwebEvents(formattedEvents);
      setIsReplayReady(true);
      setIsReplayLoading(false);
    } catch (err) {
      setReplayError("Failed to process replay data");
      setIsReplayLoading(false);
    }
  }, [replayEvents]);

  // Effect to initialize rrweb player
  useEffect(() => {
    // Initialize the player when data is ready and component is mounted
    if (isReplayReady && rrwebEvents.length > 0 && playerContainerRef.current) {
      // Dynamically import rrweb-player
      import("rrweb-player")
        .then(({ default: rrwebPlayer }) => {
          // Also import the CSS
          import("rrweb-player/dist/style.css");

          if (playerInstanceRef.current) {
            // Clean up previous instance
            playerInstanceRef.current = null;
          }

          // Create new player instance
          playerInstanceRef.current = new rrwebPlayer({
            target: playerContainerRef.current!,
            props: {
              events: rrwebEvents,
              showController: true,
              autoPlay: false, // Start paused initially
              width: playerContainerRef.current?.clientWidth,
              height: (playerContainerRef.current?.clientHeight - 80) || 500,
            },
          });
        })
        .catch((err) => {
          setReplayError("Failed to initialize replay player");
        });
    }

    // Clean up on unmount
    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current = null; // Basic cleanup, rrweb might have its own dispose method
      }
    };
  }, [isReplayReady, rrwebEvents]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push(`/mailboxes/${mailbox.slug}/sessions`)} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
          <h1 className="text-xl font-semibold">Session Details</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="mx-auto max-w-4xl mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>
                  Created {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                </CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(session.status)}>{session.status}</Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Instructions</h3>
              <div className=" p-4 rounded-md">{session.instructions}</div>
            </div>

            <h3 className="text-lg font-medium mb-4">Timeline</h3>

            {session.events.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No events recorded for this session</p>
            ) : (
              <Timeline>
                {session.events.map((event, index) => (
                  <TimelineItem key={event.id}>
                    <TimelineItem.Content>
                      <div className="flex flex-col mb-4">
                        <div className="flex items-center mb-1">
                          <h4 className="font-medium capitalize">{event.type.replace(/_/g, " ")}</h4>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        {formatEventData(event)}
                      </div>
                    </TimelineItem.Content>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>

        {/* Session Replay Card */}
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
            <CardDescription>Replay of user actions during this guide session</CardDescription>
          </CardHeader>

          <CardContent>
            {isReplayLoading && (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            )}

            {replayError && (
              <div className="py-8 text-center">
                <p className="text-destructive">{replayError}</p>
              </div>
            )}

            <div
              ref={playerContainerRef}
              className="aspect-video w-full min-h-[500px] bg-muted rounded-md"
              style={{ display: isReplayReady && rrwebEvents.length > 0 && !replayError ? "block" : "none" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
