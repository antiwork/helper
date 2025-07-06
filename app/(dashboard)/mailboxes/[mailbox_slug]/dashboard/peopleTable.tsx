"use client";

import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { type TimeRange } from "./dashboardContent";

type Props = {
  mailboxSlug: string;
  timeRange: TimeRange;
  customDate?: DateRange;
};

type Member = RouterOutputs["mailbox"]["members"]["stats"][number];

export const PeopleTable = ({ mailboxSlug, timeRange, customDate }: Props) => {
  const statsInput =
    timeRange === "custom"
      ? { mailboxSlug, period: "24h" as const, customStartDate: customDate?.from, customEndDate: customDate?.to }
      : { mailboxSlug, period: timeRange };

  const { data: members, isLoading } = api.mailbox.members.stats.useQuery(statsInput, {
    enabled: timeRange !== "custom" || !!(customDate?.from && customDate?.to),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex-1 min-h-0">
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-0 py-3">
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="px-0 py-3 text-right">
                    <Skeleton className="h-4 w-[60px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {members?.length ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="px-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </TableHead>
                <TableHead className="px-0 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
                  Replies
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: Member) => (
                <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="px-0 py-3 font-medium">{member.displayName}</TableCell>
                  <TableCell className="px-0 py-3 text-right font-mono text-sm">
                    {member.replyCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-muted-foreground">No data available.</div>
      )}
    </div>
  );
};
