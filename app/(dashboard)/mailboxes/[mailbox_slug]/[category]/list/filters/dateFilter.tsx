import { endOfDay, endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
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
  initialStartDate,
  initialEndDate,
  onSelect,
}: {
  initialStartDate: string | null;
  initialEndDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<DatePresetValue>(() => {
    if (!initialStartDate) return "allTime";

    // Try to match initial dates to a preset
    const initialFrom = new Date(initialStartDate);
    const initialTo = initialEndDate ? new Date(initialEndDate) : undefined;

    for (const { value, getRange } of DATE_PRESETS) {
      if (value === "custom") continue;
      const range = getRange();
      if (
        range &&
        range.from.getTime() === initialFrom.getTime() &&
        range.to &&
        initialTo &&
        range.to.getTime() === initialTo.getTime()
      ) {
        return value;
      }
    }
    return "custom";
  });

  const [customDate, setCustomDate] = useState<DateRange | undefined>(
    initialStartDate && selectedPreset === "custom"
      ? { from: new Date(initialStartDate), to: initialEndDate ? new Date(initialEndDate) : undefined }
      : undefined,
  );

  const [showCustomPicker, setShowCustomPicker] = useState(selectedPreset === "custom");

  const handlePresetChange = (value: string) => {
    const validPresets = DATE_PRESETS.map((p) => p.value);
    if (!validPresets.includes(value as DatePresetValue)) {
      console.error(`Invalid preset value: ${value}`);
      return;
    }
    const presetValue = value as DatePresetValue;

    if (presetValue === "custom") {
      // we purposely don't call setSelectedPreset here because we want that to be done when the user selects a date
      setShowCustomPicker(true);
      return;
    }

    setSelectedPreset(presetValue);
    setShowCustomPicker(false);

    const preset = DATE_PRESETS.find((p) => p.value === presetValue);
    if (preset) {
      const range = preset.getRange();
      onSelect(range?.from.toISOString() ?? null, range?.to.toISOString() ?? null);
    }
  };

  const handleCustomDateSelect = (date: DateRange | undefined) => {
    setCustomDate(date);
    if (date?.from) {
      setSelectedPreset("custom");
      onSelect(date.from.toISOString(), date.to ? endOfDay(date.to).toISOString() : null);
    }
  };

  const getButtonLabel = () => {
    if (selectedPreset === "allTime") return "Created";

    const preset = DATE_PRESETS.find((p) => p.value === selectedPreset);
    if (!preset) return "Created";

    if (selectedPreset === "custom" && customDate?.from) {
      return customDate.to
        ? `${customDate.from.toLocaleDateString()} - ${customDate.to.toLocaleDateString()}`
        : customDate.from.toLocaleDateString();
    }

    return preset.label;
  };

  const clearFilter = () => {
    setSelectedPreset("allTime");
    setCustomDate(undefined);
    setShowCustomPicker(false);
    onSelect(null, null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={selectedPreset !== "allTime" ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {getButtonLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto">
        {!showCustomPicker ? (
          <DropdownMenuRadioGroup value={selectedPreset} onValueChange={handlePresetChange} className="flex flex-col">
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
        ) : (
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
                  setCustomDate(undefined);
                  clearFilter();
                  setShowCustomPicker(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
