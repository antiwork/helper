import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        {/* Mobile header */}
        <div className="block sm:hidden h-14 shrink-0 border-b bg-sidebar border-sidebar px-4">
          <div className="flex items-center justify-between gap-4 h-full">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>

        {/* Dashboard Alerts */}
        <div className="p-4">
          <Skeleton className="h-[60px] w-full md:w-96" />
        </div>

        {/* Dashboard Content */}
        <div className="p-4 flex flex-col gap-4 bg-sidebar">
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-10 w-[140px]" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Ticket status charts placeholder */}
            <Panel className="h-[800px] md:h-[400px] md:col-span-2">
              <div className="grid md:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col">
                  <Skeleton className="h-6 w-32 mb-6 bg-gray-200" />
                  <div className="flex flex-col items-center justify-center flex-1">
                    <div className="relative mb-8">
                      <div className="w-48 h-48 rounded-full border-[20px] border-gray-200 relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Skeleton className="h-12 w-8 mb-2 bg-gray-200" />
                          <Skeleton className="h-4 w-12 bg-gray-200" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-800"></div>
                        <Skeleton className="w-12 h-4 bg-gray-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-600"></div>
                        <Skeleton className="w-20 h-4 bg-gray-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <Skeleton className="w-24 h-4 bg-gray-200" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <Skeleton className="h-6 w-40 mb-6 bg-gray-200" />
                  <div className="flex-1">
                    <div className="flex justify-between py-3 border-b border-gray-200 mb-4">
                      <Skeleton className="h-4 w-12 bg-gray-200" />
                      <Skeleton className="h-4 w-16 bg-gray-200" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between py-2">
                        <Skeleton className="h-4 w-44 bg-gray-200" />
                        <Skeleton className="h-4 w-4 bg-gray-200" />
                      </div>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between py-2">
                          <Skeleton className="h-4 w-32 bg-gray-200" />
                          <Skeleton className="h-4 w-4 bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Chart Reactions placeholder */}
            <Panel className="h-[400px] md:-order-1">
              <div className="flex flex-col h-full">
                <Skeleton className="h-6 w-24 mb-4 bg-gray-200" />
                <div className="flex-1 flex flex-col justify-center px-4">
                  <div className="flex items-end justify-center gap-2 h-48 mb-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const heights = [20, 32, 8, 24, 16, 28, 12] as const;
                      const heightValue = heights[i] ?? 0;

                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <Skeleton
                            className="w-full bg-green-500/20 rounded-t"
                            style={{ height: `${heightValue}px` }}
                          />
                          <div className="w-full h-px bg-gray-300"></div>
                          {i % 3 === 1 && (
                            <Skeleton
                              className="w-full bg-red-500/20 rounded-b"
                              style={{ height: `${heightValue / 2}px` }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-2 mb-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-8 bg-gray-200" />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 bg-green-500/30" />
                    <Skeleton className="w-12 h-4 bg-gray-200" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 bg-red-500/30" />
                    <Skeleton className="w-12 h-4 bg-gray-200" />
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <Skeleton className="h-9 w-44 mt-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Panel key={i} className="p-0">
                <div className="flex flex-col p-5">
                  <div className="flex gap-3 mb-2 items-center min-w-0">
                    <Skeleton className="h-4 flex-1 bg-gray-200" />
                    <Skeleton className="h-6 w-16 bg-gray-200" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-6 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 bg-gray-200" />
                    <Skeleton className="h-4 flex-1 bg-gray-200" />
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
