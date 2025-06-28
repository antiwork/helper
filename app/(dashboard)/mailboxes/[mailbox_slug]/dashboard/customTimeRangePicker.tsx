"use client";

import { format, parse } from "date-fns";
import { useEffect, useState } from "react";
import { DateRange as DayPickerDateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type DateRange = DayPickerDateRange;

type Props = {
  onSelect: (date: DateRange) => void;
  className?: string;
  selectedDate?: DateRange;
  mailboxSlug: string;
};

export function CustomTimeRangePicker({ onSelect, className, selectedDate, mailboxSlug }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>(
    selectedDate?.from && selectedDate?.to
      ? { from: selectedDate.from, to: selectedDate.to }
      : { from: undefined, to: undefined },
  );
  const [timeFrom, setTimeFrom] = useState(() => (selectedDate?.from ? format(selectedDate.from, "HH:mm") : "00:00"));
  const [timeTo, setTimeTo] = useState(() => (selectedDate?.to ? format(selectedDate.to, "HH:mm") : "23:59"));
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(selectedDate);
  useEffect(() => {
    if (selectedDate?.from && selectedDate?.to) {
      setAppliedRange(selectedDate);
      setDateRange(selectedDate);
      setTimeFrom(format(selectedDate.from, "HH:mm"));
      setTimeTo(format(selectedDate.to, "HH:mm"));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (dateRange?.from && !timeFrom) {
      setTimeFrom("00:00");
    }
    if (dateRange?.to && !timeTo) {
      setTimeTo("23:59");
    }
  }, [dateRange?.from, dateRange?.to, timeFrom, timeTo]);

  const isValidTimeRange = () => {
    if (!dateRange?.from || !dateRange?.to || !timeFrom || !timeTo) return false;

    if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
      const [fromHstr, fromMstr] = timeFrom.split(":");
      const [toHstr, toMstr] = timeTo.split(":");
      const fromH = Number(fromHstr);
      const fromM = Number(fromMstr);
      const toH = Number(toHstr);
      const toM = Number(toMstr);
      if ([fromH, fromM, toH, toM].some((n) => isNaN(n))) return false;
      return fromH < toH || (fromH === toH && fromM < toM);
    }

    return true;
  };

  const handleSelect = () => {
    if (!dateRange?.from || !dateRange?.to || !isValidTimeRange()) return;

    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);

    if (timeFrom) {
      const [hstr, mstr] = timeFrom.split(":");
      const h = Number(hstr);
      const m = Number(mstr);
      if (!isNaN(h) && !isNaN(m)) from.setHours(h, m, 0, 0);
    }

    if (timeTo) {
      const [hstr, mstr] = timeTo.split(":");
      const h = Number(hstr);
      const m = Number(mstr);
      if (!isNaN(h) && !isNaN(m)) to.setHours(h, m, 59, 999);
    }

    const newRange = { from, to };
    setAppliedRange(newRange);
    onSelect(newRange);
  };

  const handleClear = () => {
    const emptyRange = { from: undefined, to: undefined };
    setDateRange(emptyRange);
    setTimeFrom("00:00");
    setTimeTo("23:59");
    setAppliedRange(undefined);
    onSelect(emptyRange);
  };

  return (
    <div className={cn("flex flex-col gap-2 md:flex-row md:gap-2 w-full", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outlined_subtle" className={cn("min-w-[120px]", !dateRange.from && "text-muted-foreground")}>
            {dateRange.from && dateRange.to
              ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
              : "Pick dates"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
            numberOfMonths={2}
            autoFocus
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>

      <div className="flex gap-2 items-center">
        <Input
          type="time"
          value={timeFrom}
          onChange={(e) => setTimeFrom(e.target.value)}
          className="w-[127px] ml-2 pr-2"
          placeholder="From"
          aria-label="Start time"
        />
        <span className="mx-1 text-muted-foreground">-</span>
        <Input
          type="time"
          value={timeTo}
          onChange={(e) => setTimeTo(e.target.value)}
          className="w-[127px] ml-2 pr-2"
          placeholder="To"
          aria-label="End time"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="bright"
          onClick={handleSelect}
          disabled={!dateRange?.from || !dateRange?.to || !isValidTimeRange()}
        >
          Apply
        </Button>
        <Button variant="outlined" onClick={handleClear} disabled={!dateRange?.from && !dateRange?.to}>
          Clear
        </Button>
      </div>
    </div>
  );
}
