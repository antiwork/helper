import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ToolCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {/* API name */}
            <Skeleton className="h-5 w-32" />
            {/* Base URL or description */}
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            {/* Refresh button */}
            <Skeleton className="h-8 w-20" />
            {/* Delete button */}
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tool list items */}
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-5 w-8" />
              <div className="grow space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ToolsListSkeleton = ({ count = 2 }: { count?: number }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <ToolCardSkeleton key={i} />
      ))}
    </div>
  );
};
