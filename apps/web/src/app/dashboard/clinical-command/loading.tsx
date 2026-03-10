export default function ClinicalCommandLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-slate-950">
      <div className="flex-shrink-0 px-4 py-2.5 border-b bg-slate-800/50 border-slate-700/60">
        <div className="flex items-center gap-3 max-w-2xl">
          <div className="h-4 w-12 rounded bg-slate-700/40 animate-pulse" />
          <div className="h-8 flex-1 max-w-xs rounded-xl bg-slate-700/30 animate-pulse" />
        </div>
      </div>

      <main className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        <div className="min-h-0 rounded-2xl border border-slate-700/40 bg-slate-800/30 backdrop-blur-sm animate-pulse">
          <div className="p-4 space-y-3">
            <div className="h-5 w-40 rounded bg-slate-700/30" />
            <div className="h-3 w-64 rounded bg-slate-700/20" />
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full rounded bg-slate-700/15" />
              <div className="h-3 w-5/6 rounded bg-slate-700/15" />
              <div className="h-3 w-4/6 rounded bg-slate-700/15" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <div className="min-h-0 rounded-2xl border border-slate-700/40 bg-slate-800/30 backdrop-blur-sm animate-pulse" style={{ flex: '1 0 0' }}>
            <div className="p-4 space-y-3">
              <div className="h-5 w-32 rounded bg-slate-700/30" />
              <div className="h-3 w-48 rounded bg-slate-700/20" />
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="h-16 rounded-lg bg-slate-700/20" />
                <div className="h-16 rounded-lg bg-slate-700/20" />
                <div className="h-16 rounded-lg bg-slate-700/20" />
                <div className="h-16 rounded-lg bg-slate-700/20" />
              </div>
            </div>
          </div>

          <div className="min-h-0 rounded-2xl border border-slate-700/40 bg-slate-800/30 backdrop-blur-sm animate-pulse" style={{ flex: '2 0 0' }}>
            <div className="p-4 space-y-3">
              <div className="h-5 w-36 rounded bg-slate-700/30" />
              <div className="h-3 w-56 rounded bg-slate-700/20" />
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-24 rounded-full bg-slate-700/20" />
                <div className="h-8 w-28 rounded-full bg-slate-700/20" />
                <div className="h-8 w-20 rounded-full bg-slate-700/20" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-slate-700/15" />
                <div className="h-3 w-5/6 rounded bg-slate-700/15" />
                <div className="h-3 w-3/4 rounded bg-slate-700/15" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
