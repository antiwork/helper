"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month_caption: "flex justify-center h-7 mx-10 relative items-center",
        weekdays: "flex flex-row",
        weekday: "text-muted-foreground w-8 font-normal text-[0.8rem]",
        month: "gap-y-4 overflow-x-hidden w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium truncate",
        button_next: cn(
          buttonVariants({
            variant: "ghost",
            className: "absolute right-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          }),
        ),
        button_previous: cn(
          buttonVariants({
            variant: "ghost",
            className: "absolute left-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          }),
        ),
        nav: "flex items-start justify-between absolute w-full",
        month_grid: "mt-4",
        week: "flex w-full mt-2",
        day: "p-0 size-8 text-sm flex-1 flex items-center justify-center has-[button]:hover:bg-accent! rounded-md has-[button]:hover:aria-selected:bg-primary! has-[button]:hover:text-accent-foreground has-[button]:hover:aria-selected:text-primary-foreground",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 text-inherit font-normal transition-none hover:bg-transparent hover:text-inherit aria-selected:opacity-100",
        ),
        range_start: "day-range-start rounded-s-md",
        range_end: "day-range-end rounded-e-md",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary! hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent hover:aria-selected:bg-accent! rounded-none aria-selected:text-accent-foreground hover:aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: ({ ...props }) => (
          <button {...props}>
            <ChevronLeft className="h-4 w-4 cursor-pointer" />
          </button>
        ),
        NextMonthButton: ({ ...props }) => (
          <button {...props}>
            <ChevronRight className="h-4 w-4 cursor-pointer" />
          </button>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
