import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VipBadge } from "./vipBadge";
import { VolumeBadge } from "./volumeBadge";

interface IssueGroupCardProps {
  group: {
    id: number;
    title: string;
    description?: string | null;
    openCount: number;
    todayCount?: number;
    weekCount?: number;
    monthCount?: number;
    vipCount?: number;
  };
  isPinned: boolean;
  onPin: (groupId: number) => void;
  onUnpin: (groupId: number) => void;
}

export function IssueGroupCard({ group, isPinned, onPin, onUnpin }: IssueGroupCardProps) {
  const affectedUsers = group.openCount;
  const cleanTitle = group.title.replace(/^\d+\s+/, "");

  return (
    <Link href={`/all?issueGroupId=${group.id}&status=open`} className="block h-full">
      <div className="group relative cursor-pointer h-full" style={{ perspective: "1000px" }}>
        {/* Stacked cards effect */}
        <div className="absolute top-0 right-0 bottom-2 left-2 transform origin-top-right group-hover:rotate-[1.5deg] transition-all duration-300 ease-out opacity-80">
          <Card className="h-full border bg-background" />
        </div>
        <div className="absolute top-0 right-0 bottom-1 left-1 transform origin-top-right group-hover:rotate-[0.8deg] transition-all duration-300 ease-out opacity-90">
          <Card className="h-full border bg-background" />
        </div>

        <Card className="relative z-10 transition-all transform origin-top-right duration-300 ease-out flex flex-col hover:shadow-xl cursor-pointer h-full bg-background border">
          <CardHeader className="pb-3 flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
                    {affectedUsers} {cleanTitle}
                  </CardTitle>
                </div>

                {group.description && (
                  <CardDescription className="line-clamp-2 text-sm mb-2">{group.description}</CardDescription>
                )}
              </div>
              <div className="flex items-center">
                <PinButton
                  isPinned={isPinned}
                  onPin={(e) => {
                    e.preventDefault();
                    onPin(group.id);
                  }}
                  onUnpin={(e) => {
                    e.preventDefault();
                    onUnpin(group.id);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <VolumeBadge todayCount={group.todayCount} weekCount={group.weekCount} monthCount={group.monthCount} />
                <VipBadge vipCount={group.vipCount} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}

function PinButton({
  isPinned,
  onPin,
  onUnpin,
}: {
  isPinned: boolean;
  onPin: (e: React.MouseEvent) => void;
  onUnpin: (e: React.MouseEvent) => void;
}) {
  return (
    <Button variant="ghost" size="sm" iconOnly onClick={isPinned ? onUnpin : onPin}>
      {isPinned ? (
        <BookmarkCheck className="h-4 w-4 text-bright" />
      ) : (
        <Bookmark className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
