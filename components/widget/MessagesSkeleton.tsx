import cx from "classnames";

export default function MessagesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div
              className={cx(
                "max-w-[80%] rounded-lg border border-gray-200 bg-white p-4",
                i % 2 === 0 ? "pr-8" : "pl-8",
              )}
            >
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
