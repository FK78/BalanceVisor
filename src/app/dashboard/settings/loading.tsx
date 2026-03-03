export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-10">
      <div className="space-y-2">
        <div className="bg-muted h-9 w-32 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-56 animate-pulse rounded-md" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-4">
          <div className="bg-muted h-5 w-32 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-48 animate-pulse rounded-md" />
          <div className="bg-muted h-10 w-full animate-pulse rounded-md" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />
        </div>
      ))}
    </div>
  );
}
