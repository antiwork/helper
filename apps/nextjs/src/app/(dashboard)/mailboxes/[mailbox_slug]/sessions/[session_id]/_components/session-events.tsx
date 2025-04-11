"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { GuideSession, GuideSessionEvent } from "@/lib/data/guide";
import { RouterOutputs } from "@/trpc";

type MailboxData = RouterOutputs["mailbox"]["get"];

interface SessionEventsProps {
  mailbox: MailboxData;
  session: GuideSession & {
    events: GuideSessionEvent[];
  };
}

export default function SessionEvents({ mailbox, session }: SessionEventsProps) {
  const router = useRouter();

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
      console.error("Error parsing event data:", error);
      return <p className="text-red-500">Error parsing event data</p>;
    }
  };

  const handleViewReplay = () => {
    router.push(`/mailboxes/${mailbox.slug}/sessions/${session.id}/replay`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push(`/mailboxes/${mailbox.slug}/sessions`)} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
          <h1 className="text-xl font-semibold">Session Events</h1>
        </div>

        <Button onClick={handleViewReplay}>
          <Play className="mr-2 h-4 w-4" />
          Watch Replay
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="mx-auto max-w-4xl">
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
                    <TimelineItem.Indicator>
                      <div className="text-lg">{eventIcons[event.type] || "🔹"}</div>
                    </TimelineItem.Indicator>
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
      </div>
    </div>
  );
}
