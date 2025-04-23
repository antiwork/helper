import { intervalToDuration } from "date-fns";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const calculateCurrentTime = (time: Date, formatter: Formatter) => {
  const duration = intervalToDuration({ start: time, end: new Date() });

  if (duration.years && duration.years > 0) return formatter.years(duration.years);
  if (duration.months && duration.months > 0) return formatter.months(duration.months);
  if (duration.days && duration.days > 0) return formatter.days(duration.days);
  if (duration.hours && duration.hours > 0) return formatter.hours(duration.hours);
  if (duration.minutes && duration.minutes > 0) return formatter.minutes(duration.minutes);
  return "now";
};

const HumanizedTime = ({ time, titlePrefix, className, format = "long" }: HumanizedTimeProps) => {
  const date = new Date(time);
  const formatter = formatters[format];
  const [currentTime, setCurrentTime] = useState<string>(calculateCurrentTime(date, formatter));

  const [titleTime, setTitleTime] = useState(date);

  useEffect(() => {
    setCurrentTime(calculateCurrentTime(date, formatter));
    setTitleTime(date);

    const timer = setInterval(() => setCurrentTime(calculateCurrentTime(date, formatter)), 60000);
    return () => clearInterval(timer);
  }, [time]);

  const longDate = titleTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{currentTime}</span>
        </TooltipTrigger>
        <TooltipContent>{titlePrefix ? `${titlePrefix} ${longDate}` : longDate}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HumanizedTime;
