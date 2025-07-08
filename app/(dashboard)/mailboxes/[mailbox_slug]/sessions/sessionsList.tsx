"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GuideSession } from "@/lib/data/guide";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SessionsListSkeleton } from "./sessionsListSkeleton";

type MailboxData = RouterOutputs["mailbox"]["get"];

interface SessionsListProps {
  mailbox: MailboxData;
  limit: number;
}

export default function SessionsList({ mailbox, limit }: SessionsListProps) {
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isLoading, isFetching, isFetchingNextPage, error } =
    api.mailbox.getSessionsPaginated.useInfiniteQuery(
      {
        limit,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const sessions = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleViewSession = (session: GuideSession) => {
    router.push(`/sessions/${session.id}`);
  };

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-destructive">Error loading sessions: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Guide Sessions</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>All Guide Sessions ({totalCount})</CardTitle>
            <CardDescription>View and manage guide sessions for {mailbox.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoading || (isFetching && sessions.length === 0)) && <SessionsListSkeleton count={5} />}

            {!(isLoading || (isFetching && sessions.length === 0)) && sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground mb-4">No guide sessions found</p>
              </div>
            )}

            {sessions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "success"
                              : session.status === "abandoned"
                                ? "destructive"
                                : "default"
                          }
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outlined" onClick={() => handleViewSession(session)}>
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {(isFetchingNextPage || hasNextPage) && (
              <div ref={ref} className="flex justify-center items-center py-4">
                {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                {!isFetchingNextPage && hasNextPage && (
                  <span className="text-sm text-muted-foreground">Scroll to load more</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
