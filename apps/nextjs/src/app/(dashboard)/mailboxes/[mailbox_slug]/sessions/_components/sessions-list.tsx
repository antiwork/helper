"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GuideSession } from "@/lib/data/guide";
import { RouterOutputs } from "@/trpc";

type MailboxData = RouterOutputs["mailbox"]["get"];

interface SessionsListProps {
  mailbox: MailboxData;
  guideSessions: GuideSession[];
}

export default function SessionsList({ mailbox, guideSessions }: SessionsListProps) {
  const router = useRouter();

  const handleViewSession = (session: GuideSession) => {
    router.push(`/mailboxes/${mailbox.slug}/sessions/${session.id}`);
  };

  const handleViewReplay = (session: GuideSession) => {
    router.push(`/mailboxes/${mailbox.slug}/sessions/${session.id}/replay`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Guide Sessions</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>All Guide Sessions</CardTitle>
            <CardDescription>View and manage guide sessions for {mailbox.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {guideSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground mb-4">No guide sessions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guideSessions.map((session) => (
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
                      <TableCell>{session.platformCustomerId}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outlined" onClick={() => handleViewSession(session)}>
                            <Clock className="mr-1 h-4 w-4" />
                            Events
                          </Button>
                          <Button size="sm" onClick={() => handleViewReplay(session)}>
                            <Play className="mr-1 h-4 w-4" />
                            Replay
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
