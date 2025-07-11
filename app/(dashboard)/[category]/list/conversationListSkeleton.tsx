import { Skeleton } from "@/components/ui/skeleton";

const ConversationListItemSkeleton = () => {
  return (
    <div className="px-1 md:px-2">
      <div className="flex w-full flex-col transition-colors border-b border-border py-3 md:py-4">
        <div className="flex items-start gap-4 px-2 md:px-4">
          {/* Checkbox */}
          <div className="w-5 flex items-center">
            <Skeleton className="h-4 w-4 mt-1" />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2">
              {/* Header row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {/* Email from */}
                  <Skeleton className="h-4 w-32 md:w-40" />
                  {/* Badge placeholder */}
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Assigned to */}
                  <Skeleton className="h-4 w-16" />
                  {/* Timestamp */}
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>

              {/* Content rows */}
              <div className="flex flex-col gap-2">
                {/* Subject line */}
                <Skeleton className="h-5 w-3/4 md:w-2/3" />
                {/* Message preview */}
                <Skeleton className="h-4 w-full md:w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConversationListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: count }, (_, i) => (
        <ConversationListItemSkeleton key={i} />
      ))}
    </div>
  );
};
