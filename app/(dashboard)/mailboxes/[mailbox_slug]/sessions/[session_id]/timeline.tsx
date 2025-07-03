"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";

export interface Event {
  id: number;
  title: string;
  date: string;
  summary: string;
  details: string;
}

interface TimelineProps {
  events: Event[];
}

// Helper component to render JSON data prettily
const JsonViewer = ({ data }: { data: any }) => {
  if (typeof data !== "object" || data === null) {
    // Use default foreground color for primitive values
    return <span className="text-foreground">{JSON.stringify(data)}</span>;
  }

  if (Array.isArray(data)) {
    return (
      <div className="pl-4 border-l border-muted">
        <span className="text-muted-foreground">[</span>
        {data.map((item, index) => (
          <div key={index} className="ml-2">
            <JsonViewer data={item} />
            {index < data.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground">]</span>
      </div>
    );
  }

  return (
    <div className="pl-4 border-l border-muted">
      <span className="text-muted-foreground">{"{"}</span>
      {Object.entries(data).map(([key, value], index, arr) => (
        <div key={key} className="ml-2">
          {/* Use yellow for keys */}
          <span className="text-yellow-500 font-semibold">{`"${key}"`}</span>
          <span className="text-muted-foreground">: </span>
          <JsonViewer data={value} />
          {index < arr.length - 1 && <span className="text-muted-foreground">,</span>}
        </div>
      ))}
      <span className="text-muted-foreground">{"}"}</span>
    </div>
  );
};

export function Timeline({ events }: TimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<number[]>([]);

  const toggleEvent = (eventId: number) => {
    setExpandedEvents((prev) => (prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]));
  };

  const renderDetails = (details: string) => {
    try {
      const parsedJson = JSON.parse(details);
      return <JsonViewer data={parsedJson} />;
    } catch (error) {
      captureExceptionAndLog(error);
      // If parsing fails, render the original string
      return <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{details}</div>;
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {events.map((event) => {
          const isExpanded = expandedEvents.includes(event.id);
          return (
            <div key={event.id} className="relative pl-6">
              <div className="absolute left-2 top-2.5 w-1.5 h-1.5 rounded-full bg-primary" />
              <div>
                <div className="flex items-center justify-between text-sm">
                  <h3 className="font-medium">{event.title}</h3>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{event.summary}</p>
                <Toggle
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 mt-1 text-xs"
                  pressed={isExpanded}
                  onPressedChange={() => toggleEvent(event.id)}
                >
                  <ChevronRight className={cn("h-3 w-3 mr-1 transition-transform", isExpanded && "rotate-90")} />
                  {isExpanded ? "Less" : "More"}
                </Toggle>
                {isExpanded && (
                  <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded border">
                    {renderDetails(event.details)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
