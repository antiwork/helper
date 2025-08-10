import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subQuarters,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { useHotkeys } from "react-hotkeys-hook";
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
    shortcut: "A",
    getRange: () => null,
  },
  {
    value: "today",
    label: "Today",
    shortcut: "T",
    getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    value: "yesterday",
    label: "Yesterday",
    shortcut: "Y",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    value: "last7days",
    label: "Last 7 days",
    shortcut: "7",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }),
  },
  {
    value: "last14days",
    label: "Last 14 days",
    shortcut: "1",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 13)), to: endOfDay(new Date()) }),
  },
  {
    value: "last30days",
    label: "Last 30 days",
    shortcut: "3",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }),
  },
  {
    value: "thisMonth",
    label: "This month",
    shortcut: "M",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    value: "lastQuarter",
    label: "Last quarter",
    shortcut: "Q",
    getRange: () => {
      const lastQuarter = subQuarters(new Date(), 1);
      return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
    },
  },
  {
    value: "thisYear",
    label: "This year",
    shortcut: "R",
    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
  {
    value: "custom",
    label: "Custom",
    shortcut: "C",
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPreset = useMemo<DatePresetValue>(() => {
    if (!startDate) return "allTime";

    const from = new Date(startDate);
    const to = endDate ? new Date(endDate) : undefined;

    for (const { value, getRange } of DATE_PRESETS) {
      if (value === "custom") continue;
      const range = getRange();
      if (range?.from && range?.to && to) {
        const fromMatches = isSameDay(range.from, from);
        const toMatches = isSameDay(range.to, to);
        if (fromMatches && toMatches) {
          return value;
        }
      }
    }

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
    if (!customDate?.from) {
      setShowCustomPicker(false);
    }
  }, [customDate]);

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

  const handleShortcut = (presetValue: DatePresetValue) => {
    if (!isOpen) return;

    handlePresetChange(presetValue);
    if (presetValue !== "custom") {
      setIsOpen(false);
    }
  };

  useHotkeys("a", () => handleShortcut("allTime"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("t", () => handleShortcut("today"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("y", () => handleShortcut("yesterday"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("7", () => handleShortcut("last7days"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("1", () => handleShortcut("last14days"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("3", () => handleShortcut("last30days"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("m", () => handleShortcut("thisMonth"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("q", () => handleShortcut("lastQuarter"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("r", () => handleShortcut("thisYear"), { enabled: isOpen, enableOnFormTags: true });
  useHotkeys("c", () => handleShortcut("custom"), { enabled: isOpen, enableOnFormTags: true });

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
    <div ref={dropdownRef}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Date Filter"
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
                  className="flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  <span className="text-xs text-muted-foreground ml-4">{preset.shortcut}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
