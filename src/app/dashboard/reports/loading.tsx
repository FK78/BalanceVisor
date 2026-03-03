export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="space-y-2">
        <div className="bg-muted h-9 w-32 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-52 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="bg-muted h-5 w-36 animate-pulse rounded-md" />
            <div className="bg-muted h-56 w-full animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="bg-muted h-5 w-44 animate-pulse rounded-md" />
        <div className="bg-muted h-56 w-full animate-pulse rounded-md" />
      </div>
    </div>
  );
}
