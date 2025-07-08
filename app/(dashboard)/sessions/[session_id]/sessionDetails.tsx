"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guideSessionReplays } from "@/db/schema";
import { GuideSession, GuideSessionEvent } from "@/lib/data/guide";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { RouterOutputs } from "@/trpc";
import { Timeline, Event as TimelineEvent } from "./timeline";

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
    conversation?: { slug: string } | null;
  };
  replayEvents: ReplayEvent[];
}

export default function SessionDetails({ session, replayEvents }: SessionDetailsProps) {
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
    } catch (error) {
      captureExceptionAndLog(error);
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
            },
          });
        })
        .catch((error) => {
          captureExceptionAndLog(error);
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
    const eventData = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

    try {
      if (event.data) {
        details = JSON.stringify(eventData, null, 2);
      }
    } catch (error) {
      captureExceptionAndLog(error);
      details = "Error parsing event data";
    }

    return {
      id: event.id,
      title: event.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), // Format title
      date: formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }),
      summary: eventData?.actionType,
      details,
    };
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push(`/sessions`)} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
            Back to sessions
          </Button>

          <h1 className="text-xl font-semibold">Session details</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 lg:items-start">
        <div className="flex flex-col gap-6 h-full min-h-0">
          <Card className="flex flex-col h-full">
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

            <CardContent className="flex flex-col flex-1 overflow-hidden">
              {session.conversation && (
                <div className="mb-4 shrink-0">
                  <Button
                    variant="outlined"
                    onClick={() => router.push(`/conversations?id=${session.conversation?.slug}`)}
                    className="w-full"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View conversation
                  </Button>
                </div>
              )}
              <div className="mb-6 shrink-0">
                <h3 className="text-lg font-medium mb-2">Instructions</h3>
                <div className=" p-4 text-sm rounded-md border border-white/10">{session.instructions}</div>
              </div>

              <div className="shrink-0">
                <h2 className="text-lg font-medium mb-4">Steps</h2>
                <div className="flex flex-col gap-2 ">
                  {session.steps?.map((step, index) => (
                    <div key={index} className="p-2 rounded-md bg-muted">
                      <p className="text-sm font-medium">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-lg font-medium mt-8 mb-4 shrink-0">Timeline</h3>
              <div className="flex-1 overflow-auto">
                {session.events.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No events recorded for this session</p>
                ) : (
                  <Timeline events={timelineEvents} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-1 flex flex-col min-h-0 h-full">
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
            <CardDescription>Replay of user actions during this guide session</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 overflow-auto">
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
              className="w-full bg-muted rounded-md"
              style={{ display: isReplayReady && rrwebEvents.length > 0 && !replayError ? "block" : "none" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
