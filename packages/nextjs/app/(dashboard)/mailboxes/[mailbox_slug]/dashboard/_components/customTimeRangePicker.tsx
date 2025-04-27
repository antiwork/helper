"use client";

import { format, parse } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (date: Date) => void;
  className?: string;
  selectedDate?: Date;
};

export function CustomTimeRangePicker({ onSelect, className, selectedDate }: Props) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [time, setTime] = useState(() => {
    if (selectedDate) {
      return format(selectedDate, "HH:mm");
    }
    return "";
  });

  useEffect(() => {
    if (date && !time) {
      setTime(format(date, "HH:mm"));
    }
  }, [date, time]);

  const handleSelect = () => {
    if (!date) return;
    try {
      const timeDate = parse(time, "HH:mm", new Date());
      const selectedDate = new Date(date);
      selectedDate.setHours(timeDate.getHours(), timeDate.getMinutes());
      onSelect(selectedDate);
    } catch (error) {
      // Invalid time format, do nothing
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outlined_subtle" className={cn(!date && "text-muted-foreground")}>
            {date ? date.toLocaleDateString() : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={setDate} autoFocus />
        </PopoverContent>
      </Popover>
      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-[120px]" />
      <Button variant="bright" onClick={handleSelect} disabled={!date}>
        Apply
      </Button>
    </div>
  );
}
