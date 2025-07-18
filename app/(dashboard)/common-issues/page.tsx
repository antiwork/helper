"use client";

import { ArrowUpDown, Bookmark, BookmarkCheck, Calendar, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { PageHeader } from "@/components/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { issueGroupsChannelId } from "@/lib/realtime/channels";
import { useRealtimeEventOnce } from "@/lib/realtime/hooks";
import { api } from "@/trpc/react";

export default function CommonIssuesPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"frequency" | "recent">("frequency");
  const limit = 20;

  // Reset page when search or sort changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, sortBy]);

  const { data, isLoading, error, refetch } = api.mailbox.issueGroups.list.useQuery({
    limit: limit * (page + 1),
    offset: 0,
  });

  const { data: pinnedData, refetch: refetchPinned } = api.mailbox.issueGroups.pinnedList.useQuery();

  const pinMutation = api.mailbox.issueGroups.pin.useMutation({
    onSuccess: () => {
      toast.success("Issue group bookmarked");
      refetchPinned();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unpinMutation = api.mailbox.issueGroups.unpin.useMutation({
    onSuccess: () => {
      toast.success("Issue group unbookmarked");
      refetchPinned();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const filteredAndSortedGroups = useMemo(() => {
    if (!data?.groups) return [];

    let filtered = data.groups;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) => group.title.toLowerCase().includes(query) || group.description?.toLowerCase().includes(query),
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "frequency") {
        return b.openCount - a.openCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [data?.groups, searchQuery, sortBy]);

  const handlePinGroup = (groupId: number, _cleanTitle: string) => {
    pinMutation.mutate({ id: groupId });
  };

  const handleUnpinGroup = (groupId: number, _cleanTitle: string) => {
    unpinMutation.mutate({ id: groupId });
  };

  useRealtimeEventOnce(issueGroupsChannelId(), "issueGroupUpdated", () => {
    refetch();
  });

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {isMobile && <PageHeader title="Common Issues" variant="mahogany" />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Error loading issue groups</h3>
            <p className="text-muted-foreground mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isMobile && <PageHeader title="Common Issues" variant="mahogany" />}

      <div className="flex-1 overflow-y-auto">
        <div className="border-b">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">Common Issues</h1>
              </div>

              <div className="flex-1 flex justify-center px-8">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={`Search ${data?.groups.length || 0} issues`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div className="flex-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      {sortBy === "frequency" ? "Frequency" : "Recent"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("frequency")}>Sort by Frequency</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("recent")}>Sort by Recent</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 pl-6 space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">{searchQuery ? "No issues found" : "No issue groups yet"}</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Issue groups will appear here as conversations are automatically clustered by topic."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                {filteredAndSortedGroups.map((group, index) => {
                  const isPinned = pinnedData?.groups.some((p) => p.id === group.id) ?? false;

                  const affectedUsers = group.openCount;

                  const cleanTitle = group.title.replace(/^\d+\s+/, "");

                  return (
                    <div
                      key={group.id}
                      className="group relative cursor-pointer h-full"
                      style={{
                        perspective: "1200px",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      {/* Subtle stacked cards effect */}
                      <div className="absolute inset-0 transform translate-x-1 translate-y-1 opacity-20 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300">
                        <Card className="h-full border shadow-xs bg-muted/20" />
                      </div>
                      <div className="absolute inset-0 transform translate-x-0.5 translate-y-0.5 opacity-30 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform duration-300">
                        <Card className="h-full border shadow-xs bg-muted/30" />
                      </div>

                      <Card className="relative z-10 transition-shadow duration-200 flex flex-col hover:shadow-md cursor-pointer h-full">
                        <CardHeader className="pb-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
                                  <Link href={`/all?issueGroupId=${group.id}`} className="hover:underline">
                                    {affectedUsers} {cleanTitle}
                                  </Link>
                                </CardTitle>
                              </div>

                              {group.description && (
                                <CardDescription className="line-clamp-2 text-sm mb-2">
                                  {group.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-muted transition-colors"
                                onClick={() =>
                                  isPinned
                                    ? handleUnpinGroup(group.id, cleanTitle)
                                    : handlePinGroup(group.id, cleanTitle)
                                }
                              >
                                {isPinned ? (
                                  <BookmarkCheck className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {(() => {
                                const todayCount = Number(group.todayCount ?? 0);
                                const weekCount = Number(group.weekCount ?? 0);
                                const monthCount = Number(group.monthCount ?? 0);

                                if (todayCount > 0) {
                                  const variant = todayCount >= 10 ? "destructive" : "gray";

                                  return (
                                    <Badge variant={variant} className="text-xs flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {todayCount} new ticket{todayCount !== 1 ? "s" : ""} today
                                    </Badge>
                                  );
                                } else if (weekCount > 0) {
                                  const variant = weekCount >= 10 ? "destructive" : "gray";

                                  return (
                                    <Badge variant={variant} className="text-xs flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {weekCount} new ticket{weekCount !== 1 ? "s" : ""} this week
                                    </Badge>
                                  );
                                } else if (monthCount > 0) {
                                  const variant = monthCount >= 10 ? "destructive" : "gray";

                                  return (
                                    <Badge variant={variant} className="text-xs flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {monthCount} new ticket{monthCount !== 1 ? "s" : ""} this month
                                    </Badge>
                                  );
                                }
                                return (
                                  <Badge variant="gray" className="text-xs flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    No new tickets
                                  </Badge>
                                );
                              })()}

                              {(() => {
                                const vipCount = Number(group.vipCount ?? 0);
                                if (vipCount > 0) {
                                  return (
                                    <Badge variant="success-light" className="text-xs flex items-center gap-1">
                                      ⭐ {vipCount} VIP user{vipCount !== 1 ? "s" : ""}
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {data?.groups?.length === limit * (page + 1) && !searchQuery && (
                <div className="flex justify-center mt-6">
                  <Button onClick={() => setPage(page + 1)} variant="outlined">
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
