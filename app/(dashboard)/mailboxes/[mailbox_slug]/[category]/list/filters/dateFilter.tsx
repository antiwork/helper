import { endOfDay, endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { assertDefined } from "@/components/utils/assert";

const DATE_PRESETS = [
  {
    value: "allTime",
    label: "All time",
    getRange: () => null,
  },
  {
    value: "today",
    label: "Today",
    getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    value: "yesterday",
    label: "Yesterday",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }),
  },
  {
    value: "last7days",
    label: "Last 7 days",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }),
  },
  {
    value: "thisMonth",
    label: "This month",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    value: "last30days",
    label: "Last 30 days",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }),
  },
  {
    value: "thisYear",
    label: "This year",
    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
  {
    value: "custom",
    label: "Custom",
    getRange: () => null,
  },
] as const;

type DatePresetValue = (typeof DATE_PRESETS)[number]["value"];

export function DateFilter({
  startDate,
  endDate,
  onSelect,
}: {
  startDate: string | null;
  endDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
}) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const selectedPreset = useMemo<DatePresetValue>(() => {
    // no start date means nothing is selected, default to "all time"
    if (!startDate) return "allTime";

    const from = new Date(startDate);
    const to = endDate ? new Date(endDate) : undefined;

    // Match selected dates to presets.
    // The timestamp comparison is fine because preset functions use date boundaries
    // (start/end of day/month/year) that are deterministic for the same date, though
    // it may fail across day boundaries  - which is fine because worst case scenario
    // we'll show the user "Custom" as the selected preset.
    for (const { value, getRange } of DATE_PRESETS) {
      if (value === "custom") continue;
      const range = getRange();
      if (range?.from.getTime() === from.getTime() && to && range.to?.getTime() === to.getTime()) {
        return value;
      }
    }

    // if no preset matches, default to "custom"
    return "custom";
  }, [startDate, endDate]);

  const customDate = useMemo<DateRange | undefined>(() => {
    if (selectedPreset === "custom" && startDate) {
      return {
        from: new Date(startDate),
        to: endDate ? new Date(endDate) : undefined,
      };
    }
    return undefined;
  }, [selectedPreset, startDate, endDate]);

  useEffect(() => {
    // this is needed to prevent the custom picker from being shown
    // when the user clears all filters
    if (!customDate?.from) {
      setShowCustomPicker(false);
    }
  }, [customDate]);

  const buttonLabel = useMemo(() => {
    if (selectedPreset === "allTime") return "Created";

    if (selectedPreset === "custom" && customDate?.from) {
      return customDate.to
        ? `${customDate.from.toLocaleDateString()} - ${customDate.to.toLocaleDateString()}`
        : customDate.from.toLocaleDateString();
    }

    const preset = assertDefined(DATE_PRESETS.find((p) => p.value === selectedPreset));
    return preset.label;
  }, [selectedPreset, customDate]);

  const handlePresetChange = (presetValue: DatePresetValue) => {
    if (presetValue === "custom") {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);

    const preset = assertDefined(DATE_PRESETS.find((p) => p.value === presetValue));
    const range = preset.getRange();
    onSelect(range?.from.toISOString() ?? null, range?.to.toISOString() ?? null);
  };

  const handleCustomDateSelect = (date: DateRange | undefined) => {
    if (!date) {
      clearFilter();
      return;
    }

    if (date?.from) {
      onSelect(date.from.toISOString(), date.to ? endOfDay(date.to).toISOString() : null);
    }
  };

  const clearFilter = () => {
    setShowCustomPicker(false);
    onSelect(null, null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="date-filter-button"
          variant={selectedPreset !== "allTime" ? "bright" : "outlined_subtle"}
          className="whitespace-nowrap"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto">
        {showCustomPicker ? (
          <div>
            <Calendar
              autoFocus
              mode="range"
              defaultMonth={customDate?.from}
              selected={customDate}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
            />
            <div className="flex justify-between p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomPicker(false);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilter();
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenuRadioGroup
            value={selectedPreset}
            onValueChange={(value) => handlePresetChange(value as DatePresetValue)}
            className="flex flex-col"
          >
            {DATE_PRESETS.map((preset) => (
              <DropdownMenuRadioItem
                key={preset.value}
                value={preset.value}
                onSelect={(event) => {
                  if (preset.value === "custom") {
                    event.preventDefault();
                  }
                }}
              >
                {preset.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
