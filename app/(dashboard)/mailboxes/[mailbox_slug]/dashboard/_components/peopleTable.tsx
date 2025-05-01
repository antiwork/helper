"use client";

import { type TimeRange } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/dashboard/_components/dashboardContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

type Props = {
  mailboxSlug: string;
  timeRange: TimeRange;
  customDate?: Date;
};

type Member = RouterOutputs["mailbox"]["members"]["stats"][number];

export const PeopleTable = ({ mailboxSlug, timeRange, customDate }: Props) => {
  const { data: members, isLoading } = api.mailbox.members.stats.useQuery(
    { mailboxSlug, period: timeRange === "custom" ? "24h" : timeRange, customDate },
    { enabled: !!mailboxSlug },
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Table>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-[120px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[60px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {members?.length ? (
        <div className="max-h-[350px] md:max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-0">Name</TableHead>
                <TableHead className="px-0">Replies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: Member) => (
                <TableRow key={member.id}>
                  <TableCell className="px-0">{member.displayName}</TableCell>
                  <TableCell className="px-0">{member.replyCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div>No data available.</div>
      )}
    </div>
  );
};
