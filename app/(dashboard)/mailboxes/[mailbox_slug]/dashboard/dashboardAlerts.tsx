import { Star, User } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

const formatHours = (hours: number) => {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"} or more`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"} or more`;
};

const DashboardAlert = ({
  icon,
  children,
  variant,
  href,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  variant: "danger" | "warning";
  href: string;
}) => {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 ${
        variant === "danger" ? "light bg-destructive text-destructive-foreground" : "bg-bright text-bright-foreground"
      } px-4 py-5 rounded-md snap-center w-full shrink-0 md:w-auto md:min-w-96 hover:opacity-90 transition-opacity`}
    >
      {icon}
      <span className="text-sm">{children}</span>
    </Link>
  );
};

export const DashboardAlerts = () => {
  const { data, isLoading } = api.mailbox.conversations.alertCounts.useQuery();

  if (isLoading)
    return (
      <div className="p-4">
        <Skeleton className="h-12 snap-center w-full shrink-0 md:w-96" />
      </div>
    );

  if (!data) return null;

  const alerts = [
    data.assignedToMe > 0 && (
      <DashboardAlert
        key="assigned"
        icon={<User className="h-5 w-5" />}
        variant="danger"
        href={`/mine`}
      >
        {data.assignedToMe} open {data.assignedToMe === 1 ? "ticket is" : "tickets are"}{" "}
        <strong>assigned to you</strong>
      </DashboardAlert>
    ),
    data.vipOverdue > 0 && (
      <DashboardAlert
        key="vip"
        icon={<Star className="h-5 w-5" />}
        variant="warning"
        href={`/conversations`}
      >
        <strong>
          {data.vipOverdue} {data.vipOverdue === 1 ? "VIP has" : "VIPs have"} been waiting
        </strong>{" "}
        {formatHours(data.vipExpectedResponseHours ?? 0)}
      </DashboardAlert>
    ),
  ].filter(Boolean);

  return alerts.length > 0 ? (
    <div className="flex overflow-x-auto snap-x snap-mandatory p-4 gap-2 md:snap-none bg-sidebar">{alerts}</div>
  ) : null;
};
