"use client";

import { ArrowUpDown, Bookmark, BookmarkCheck, Calendar, Search, Share, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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

  const { data, isLoading, error, refetch } = api.mailbox.issueGroups.list.useQuery({
    limit,
    offset: page * limit,
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

  // Filter and sort groups based on search and sort criteria
  const filteredAndSortedGroups = useMemo(() => {
    if (!data?.groups) return [];

    let filtered = data.groups;

    // Client-side search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) => group.title.toLowerCase().includes(query) || group.description?.toLowerCase().includes(query),
      );
    }

    // Sort by frequency (open count) or recent updates
    filtered.sort((a, b) => {
      if (sortBy === "frequency") {
        return b.openCount - a.openCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [data?.groups, searchQuery, sortBy]);


  const handleShareGroup = (groupId: number) => {
    const url = `${window.location.origin}/all?issueGroupId=${groupId}`;
    navigator.clipboard.writeText(url);
    toast.success("Issue group link copied to clipboard");
  };

  const handlePinGroup = (groupId: number, _cleanTitle: string) => {
    pinMutation.mutate({ id: groupId });
  };

  const handleUnpinGroup = (groupId: number, _cleanTitle: string) => {
    unpinMutation.mutate({ id: groupId });
  };

  // Listen for realtime updates
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
        {/* Header section */}
        <div className="border-b border-gray-200 bg-white">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left side: Title and description */}
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">Common Issues</h1>
              </div>

              {/* Center: Search Bar */}
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

              {/* Right side: Sort control */}
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

        {/* Main content area */}
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
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedGroups.map((group, index) => {
                  const isPinned = pinnedData?.groups.some((p) => p.id === group.id) ?? false;

                  // Use actual open count from the group data
                  const affectedUsers = group.openCount;

                  // Clean title by removing any existing number prefix
                  const cleanTitle = group.title.replace(/^\d+\s+/, "");

                  return (
                    <div
                      key={group.id}
                      className="group relative cursor-pointer"
                      style={{
                        perspective: "1200px",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      {/* Background deck layers - 4 layers for rich effect */}
                      <div className="absolute inset-0 transform rotate-1 translate-x-2 translate-y-3 opacity-40 group-hover:opacity-70 transition-all duration-500 ease-out group-hover:rotate-3 group-hover:translate-x-4 group-hover:translate-y-4 group-hover:scale-95">
                        <Card className="h-full border-2 border-slate-300 shadow-lg bg-slate-100 backdrop-blur-sm" />
                      </div>
                      <div className="absolute inset-0 transform -rotate-0.5 translate-x-1.5 translate-y-2 opacity-50 group-hover:opacity-80 transition-all duration-400 ease-out group-hover:-rotate-2 group-hover:translate-x-3 group-hover:translate-y-3 group-hover:scale-97">
                        <Card className="h-full border-2 border-slate-200 shadow-md bg-slate-50 backdrop-blur-sm" />
                      </div>
                      <div className="absolute inset-0 transform rotate-0.5 translate-x-1 translate-y-1 opacity-60 group-hover:opacity-90 transition-all duration-300 ease-out group-hover:rotate-1 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:scale-98">
                        <Card className="h-full border border-gray-300 shadow-md bg-gray-50 backdrop-blur-sm" />
                      </div>

                      {/* Main card */}
                      <Card className="relative z-20 transition-all duration-300 ease-out flex flex-col h-full border-2 border-gray-300 shadow-xl bg-white group-hover:transform group-hover:-translate-y-4 group-hover:shadow-2xl group-hover:scale-105 group-hover:border-blue-400">
                        <CardHeader className="pb-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-lg font-bold line-clamp-2 flex-1">
                                  <Link
                                    href={`/all?issueGroupId=${group.id}`}
                                    className="hover:underline text-gray-900"
                                  >
                                    {affectedUsers} {cleanTitle}
                                  </Link>
                                </CardTitle>
                              </div>

                              {/* Always reserve space for description to maintain consistent height */}
                              <div className="h-10 mb-2">
                                {group.description && (
                                  <CardDescription className="line-clamp-2 text-sm">
                                    {group.description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            {/* Only bookmark icon in top right */}
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-yellow-100 transition-colors duration-200"
                                onClick={() =>
                                  isPinned
                                    ? handleUnpinGroup(group.id, cleanTitle)
                                    : handlePinGroup(group.id, cleanTitle)
                                }
                              >
                                {isPinned ? (
                                  <BookmarkCheck className="h-5 w-5 text-yellow-500 drop-shadow-sm" />
                                ) : (
                                  <Bookmark className="h-5 w-5 text-gray-600 hover:text-yellow-500" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                          {/* Bold badges and icons inline at bottom */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {(() => {
                                // Ensure numeric values
                                const todayCount = Number(group.todayCount ?? 0);
                                const weekCount = Number(group.weekCount ?? 0);
                                const monthCount = Number(group.monthCount ?? 0);

                                // Simple two-color system: gray for low volume, red for high volume
                                if (todayCount > 0) {
                                  const badgeClass =
                                    todayCount >= 10
                                      ? "bg-red-500 text-white border-red-600 shadow-lg" // High volume - RED
                                      : "bg-gray-50 text-gray-700 border-gray-200 shadow-lg"; // Low volume - SUPER LIGHT GRAY

                                  return (
                                    <Badge
                                      className={`${badgeClass} text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 rounded-md`}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {todayCount} new ticket{todayCount !== 1 ? "s" : ""} today
                                    </Badge>
                                  );
                                } else if (weekCount > 0) {
                                  const badgeClass =
                                    weekCount >= 10
                                      ? "bg-red-500 text-white border-red-600 shadow-lg" // High volume - RED
                                      : "bg-gray-50 text-gray-700 border-gray-200 shadow-lg"; // Low volume - SUPER LIGHT GRAY

                                  return (
                                    <Badge
                                      className={`${badgeClass} text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 rounded-md`}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {weekCount} new ticket{weekCount !== 1 ? "s" : ""} this week
                                    </Badge>
                                  );
                                } else if (monthCount > 0) {
                                  const badgeClass =
                                    monthCount >= 10
                                      ? "bg-red-500 text-white border-red-600 shadow-lg" // High volume - RED
                                      : "bg-gray-50 text-gray-700 border-gray-200 shadow-lg"; // Low volume - SUPER LIGHT GRAY

                                  return (
                                    <Badge
                                      className={`${badgeClass} text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 rounded-md`}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {monthCount} new ticket{monthCount !== 1 ? "s" : ""} this month
                                    </Badge>
                                  );
                                }
                                return (
                                  <Badge className="bg-gray-50 text-gray-600 border-gray-200 shadow-lg text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 rounded-md">
                                    <Calendar className="h-3 w-3" />
                                    No new tickets
                                  </Badge>
                                );
                              })()}

                              {/* VIP badge - BRIGHT GOLD */}
                              {(() => {
                                const vipCount = Number(group.vipCount ?? 0);
                                if (vipCount > 0) {
                                  return (
                                    <Badge className="bg-yellow-500 text-white border-yellow-600 shadow-lg text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 rounded-md">
                                      ⭐ {vipCount} VIP user{vipCount !== 1 ? "s" : ""}
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            {/* Share icon with bright styling */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                                onClick={() => handleShareGroup(group.id)}
                              >
                                <Share className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {data?.groups?.length === limit && !searchQuery && (
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
