"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { guideSessionReplays } from "@/db/schema";
import { RouterOutputs } from "@/trpc";

type RRWebEvent = {
  type: number;
  data: any;
  timestamp: number;
};

type MailboxData = RouterOutputs["mailbox"]["get"];
type ReplayEvent = typeof guideSessionReplays.$inferSelect;

interface SessionReplayProps {
  mailbox: MailboxData;
  sessionId: number;
  replayEvents: ReplayEvent[];
}

export default function SessionReplay({ mailbox, sessionId, replayEvents }: SessionReplayProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [events, setEvents] = useState<RRWebEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (replayEvents.length === 0) {
      setError("No replay events found for this session");
      setIsLoading(false);
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

      setEvents(formattedEvents);
      setIsReady(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Error processing replay events:", err);
      setError("Failed to process replay data");
      setIsLoading(false);
    }
  }, [replayEvents]);

  useEffect(() => {
    // Initialize the player when data is ready and component is mounted
    if (isReady && events.length > 0 && playerContainerRef.current) {
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
              events,
              showController: true,
              autoPlay: true,
              width: playerContainerRef.current?.clientWidth,
              height: playerContainerRef.current?.clientHeight || 600,
            },
          });
        })
        .catch((err) => {
          console.error("Failed to load rrweb player:", err);
          setError("Failed to initialize replay player");
        });
    }

    // Clean up on unmount
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current = null;
        } catch (e) {
          console.error("Error cleaning up player:", e);
        }
      }
    };
  }, [isReady, events]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center">
        <Button variant="ghost" onClick={() => router.push(`/mailboxes/${mailbox.slug}/sessions`)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Sessions
        </Button>
        <h1 className="text-xl font-semibold">Session Replay</h1>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Session Replay #{sessionId}</CardTitle>
            <CardDescription>Replay of user actions during this guide session</CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            )}

            {error && (
              <div className="py-8 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            )}

            <div
              ref={playerContainerRef}
              className="aspect-video w-full min-h-[600px]"
              style={{ display: isReady && events.length > 0 && !error ? "block" : "none" }}
            />
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">Total Events: {replayEvents.length}</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
