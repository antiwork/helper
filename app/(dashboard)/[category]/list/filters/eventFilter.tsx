import { BellIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EVENT_OPTIONS = [
  {
    value: "request_human_support",
    label: "Escalated to a human",
  },
] as const;

type EventType = (typeof EVENT_OPTIONS)[number]["value"];

interface EventFilterProps {
  selectedEvents: EventType[];
  onChange: (events: EventType[]) => void;
}

export const EventFilter = memo(function EventFilter({ selectedEvents, onChange }: EventFilterProps) {
  const buttonText =
    selectedEvents.length === 1
      ? EVENT_OPTIONS.find((event) => event.value === selectedEvents[0])?.label
      : selectedEvents.length > 1
        ? `${selectedEvents.length} events`
        : "Events";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={selectedEvents.length > 0 ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <BellIcon className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {EVENT_OPTIONS.map((event) => {
          const isChecked = selectedEvents.includes(event.value);
          return (
            <DropdownMenuCheckboxItem
              key={event.value}
              checked={isChecked}
              onCheckedChange={(checked) => {
                onChange(checked ? [...selectedEvents, event.value] : selectedEvents.filter((e) => e !== event.value));
              }}
            >
              {event.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
