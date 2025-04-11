"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, Event as TimelineEvent } from "@/components/ui/timeline";
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
              autoPlay: true,
              width: playerContainerRef.current?.clientWidth,
              height: (playerContainerRef.current?.clientHeight || 500) - 80, // Use full height
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

  // Prepare events for the new Timeline component
  const timelineEvents: TimelineEvent[] = session.events.map((event) => {
    let details = "No data available";
    try {
      if (event.data) {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        details = JSON.stringify(data, null, 2);
      }
    } catch (error) {
      details = "Error parsing event data";
    }

    return {
      id: event.id,
      title: event.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), // Format title
      date: formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }),
      summary: `Event ${event.type}`, // Add required summary property
      details,
    };
  });

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

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Details Section */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{session.title}</CardTitle>
                  <CardDescription className="mt-2">
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
                <Timeline events={timelineEvents} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Replay Section */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
            <CardDescription>Replay of user actions during this guide session</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col flex-1">
            {isReplayLoading && (
              <div className="flex justify-center items-center py-16 flex-1">
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
              className="w-full min-h-[500px] bg-muted rounded-md flex-1"
              style={{ display: isReplayReady && rrwebEvents.length > 0 && !replayError ? "flex" : "none" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
