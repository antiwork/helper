import { Skeleton } from "@/components/ui/skeleton";

const ConversationListItemSkeleton = () => {
  return (
    <div>
      <div className="flex w-full cursor-pointer flex-col transition-colors border-b border-border py-3 md:py-4">
        <div className="flex items-start gap-4 px-4">
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
                  <Skeleton className="h-3 w-12" />
                  {/* Timestamp */}
                  <Skeleton className="h-3 w-16" />
                  {/* New indicator placeholder */}
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              </div>

              {/* Content rows */}
              <div className="flex flex-col gap-2">
                {/* Subject line */}
                <Skeleton className="h-5 md:h-6 w-3/4 md:w-2/3" />
                {/* Message preview */}
                <Skeleton className="h-4 md:h-5 w-full md:w-5/6" />
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
