export default function InvestmentsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-60 animate-pulse rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
          <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <div className="bg-muted h-4 w-20 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="bg-muted h-5 w-32 animate-pulse rounded-md mb-4" />
          <div className="bg-muted h-48 w-full animate-pulse rounded-md" />
        </div>
        <div className="rounded-lg border p-6">
          <div className="bg-muted h-5 w-32 animate-pulse rounded-md mb-4" />
          <div className="bg-muted h-48 w-full animate-pulse rounded-md" />
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-3">
        <div className="bg-muted h-5 w-28 animate-pulse rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-12 w-full animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
