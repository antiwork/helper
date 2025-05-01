import { differenceInDays, differenceInMonths, format, subDays, subHours, subMonths } from "date-fns";
import { type Period } from "./reactionsChart";

export type TimePeriod<T> = T & {
  label: string;
  startTime: Date;
  endTime: Date;
};

export function generateTimePeriods<T>(period: Period, startDate: Date, defaultValue: () => T) {
  const now = new Date();
  const periods: Record<string, TimePeriod<T>> = {};

  if (period === "hourly") {
    for (let i = 23; i >= 0; i--) {
      const date = subHours(now, i);
      date.setUTCMinutes(0, 0, 0);
      const dbFormat = format(date, "yyyy-MM-dd HH:00:00");
      const endTime = new Date(date.getTime() + 3600000); // Add 1 hour
      periods[dbFormat] = {
        ...defaultValue(),
        label: date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          hour12: false,
          minute: "2-digit",
        }),
        startTime: date,
        endTime,
      };
    }
  } else if (period === "daily") {
    const daysDiff = differenceInDays(now, startDate);
    for (let i = daysDiff - 1; i >= 0; i--) {
      const date = subDays(now, i);
      date.setUTCHours(0, 0, 0, 0);
      const dbFormat = format(date, "yyyy-MM-dd");
      const endTime = new Date(date.getTime() + 86400000); // Add 1 day
      periods[dbFormat] = {
        ...defaultValue(),
        label: date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
        startTime: date,
        endTime,
      };
    }
  } else {
    const monthsDiff = differenceInMonths(now, startDate);
    for (let i = monthsDiff; i >= 0; i--) {
      const date = subMonths(now, i);
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      const dbFormat = format(date, "yyyy-MM");
      const endTime = new Date(date);
      endTime.setUTCMonth(endTime.getUTCMonth() + 1);
      periods[dbFormat] = {
        ...defaultValue(),
        label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        startTime: date,
        endTime,
      };
    }
    periods[format(now, "yyyy-MM")] = {
      ...defaultValue(),
      label: now.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      startTime: now,
      endTime: now,
    };
  }

  return periods;
}
