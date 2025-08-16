import { Card, CardContent } from "@/components/ui/card";

export function MemberCardLoadingSkeleton() {
  return (
    <Card className="md:hidden mb-4">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-muted" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-2.5 w-3/4 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-9 w-full rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="h-9 w-full rounded-md bg-muted" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 w-20 rounded bg-muted" />
            <div className="h-9 w-full rounded-md bg-muted" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-16 rounded bg-muted" />
          <div className="h-9 w-full rounded-md bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
