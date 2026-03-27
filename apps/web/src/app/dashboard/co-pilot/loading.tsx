export default function CoPilotLoading() {
  return (
    <div className="flex h-full bg-gray-950">
      {/* Col 1 skeleton */}
      <div className="w-[26%] border-r border-white/[0.06] p-4 hidden md:block">
        <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse" />
        <div className="mt-6 space-y-3">
          <div className="h-2 w-full bg-white/[0.04] rounded animate-pulse" />
          <div className="h-2 w-3/4 bg-white/[0.04] rounded animate-pulse" />
        </div>
      </div>
      {/* Col 2 skeleton */}
      <div className="flex-1 border-r border-white/[0.06] p-4">
        <div className="flex gap-2 mb-4">
          <div className="h-7 w-16 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-7 w-20 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Col 3 skeleton */}
      <div className="w-[32%] p-4 hidden md:block">
        <div className="h-3 w-20 bg-white/[0.06] rounded animate-pulse" />
      </div>
    </div>
  );
}
