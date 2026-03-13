export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="space-y-1">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-2 w-36 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-2 w-20 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>

        {/* Mini stats skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-12 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b border-slate-100 px-4 py-3 flex gap-6">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
