import { intervalToDuration } from "date-fns";
import { useNow } from "./hooks/use-now";

type HumanizedTimeProps = {
  time: string | Date;
  titlePrefix?: string;
  className?: string;
  format?: "short" | "long";
};

const formatters = {
  short: {
    years: (n: number) => `${n}y`,
    months: (n: number) => `${n}mo`,
    days: (n: number) => `${n}d`,
    hours: (n: number) => `${n}h`,
    minutes: (n: number) => `${n}m`,
  },
  long: {
    years: (n: number) => `${n} ${n === 1 ? "year" : "years"} ago`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"} ago`,
    days: (n: number) => `${n} ${n === 1 ? "day" : "days"} ago`,
    hours: (n: number) => `${n} ${n === 1 ? "hour" : "hours"} ago`,
    minutes: (n: number) => `${n} ${n === 1 ? "minute" : "minutes"} ago`,
  },
};

type Formatter = (typeof formatters)["short" | "long"];

const calculateCurrentTime = (time: Date, now: Date, formatter: Formatter) => {
  const duration = intervalToDuration({ start: time, end: now });

  if (duration.years && duration.years > 0) return formatter.years(duration.years);
  if (duration.months && duration.months > 0) return formatter.months(duration.months);
  if (duration.days && duration.days > 0) {
    const hours = duration.hours || 0;
    if (hours > 0 && formatter === formatters.long) {
      return `${duration.days} ${duration.days === 1 ? "day" : "days"} ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    return `${formatter.days(duration.days)}${hours > 0 ? ` ${formatter.hours(hours)}` : ""}`;
  }
  if (duration.hours && duration.hours > 0) return formatter.hours(duration.hours);
  if (duration.minutes && duration.minutes > 0) return formatter.minutes(duration.minutes);
  return "now";
};

const HumanizedTime = ({ time, titlePrefix, className, format = "short" }: HumanizedTimeProps) => {
  const now = useNow();

  const date = new Date(time);
  const formatter = formatters[format];

  const currentTime = calculateCurrentTime(date, now, formatter);

  const longDate = date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <span className={className} title={titlePrefix ? `${titlePrefix} ${longDate}` : longDate}>
      {currentTime}
    </span>
  );
};

export default HumanizedTime;
