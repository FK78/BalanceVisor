export default function GoalsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-52 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted h-10 w-10 animate-pulse rounded-xl" />
              <div className="space-y-1.5">
                <div className="bg-muted h-5 w-32 animate-pulse rounded-md" />
                <div className="bg-muted h-3 w-44 animate-pulse rounded-md" />
              </div>
            </div>
            <div className="bg-muted h-2.5 w-full animate-pulse rounded-full" />
            <div className="flex justify-between">
              <div className="bg-muted h-3 w-20 animate-pulse rounded-md" />
              <div className="bg-muted h-3 w-16 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
