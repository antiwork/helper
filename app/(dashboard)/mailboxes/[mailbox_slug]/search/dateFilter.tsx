import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateFilter({
  initialStartDate,
  initialEndDate,
  onSelect,
}: {
  initialStartDate: string | null;
  initialEndDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
}) {
  const [date, setDate] = useState<DateRange | undefined>(
    initialStartDate
      ? { from: new Date(initialStartDate), to: initialEndDate ? new Date(initialEndDate) : undefined }
      : undefined,
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={date ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {date?.from ? (
            date.to ? (
              <>
                {date.from.toLocaleDateString()} - {date.to.toLocaleDateString()}
              </>
            ) : (
              date.from.toLocaleDateString()
            )
          ) : (
            "Created"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div>
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(date) => {
              setDate(date);
              onSelect(
                date?.from?.toISOString() ?? null,
                date?.to?.toISOString().replace("T00:00:00.000Z", "T23:59:59.999Z") ?? null,
              );
            }}
            numberOfMonths={2}
          />
          <div className="flex justify-center p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDate(undefined);
                onSelect(null, null);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
