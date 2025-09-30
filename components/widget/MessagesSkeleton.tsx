export default function MessagesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex">
            <div className="w-full rounded-lg border border-gray-200 bg-white p-4">
              <div className="space-y-2">
                <div className="h-4 w-64 animate-skeleton rounded bg-gray-100" />
                <div className="h-4 w-48 animate-skeleton rounded bg-gray-100" />
                <div className="h-4 w-56 animate-skeleton rounded bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
