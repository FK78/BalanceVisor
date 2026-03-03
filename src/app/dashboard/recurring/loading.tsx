export default function RecurringLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-9 w-36 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-56 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted h-10 w-10 animate-pulse rounded-xl" />
              <div className="space-y-1.5">
                <div className="bg-muted h-4 w-36 animate-pulse rounded-md" />
                <div className="bg-muted h-3 w-28 animate-pulse rounded-md" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <div className="bg-muted h-5 w-20 animate-pulse rounded-md ml-auto" />
              <div className="bg-muted h-3 w-16 animate-pulse rounded-md ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
