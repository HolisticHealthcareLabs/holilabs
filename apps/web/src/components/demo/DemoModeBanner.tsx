'use client';

/**
 * Persistent "DEMO MODE" banner shown at the top of the dashboard
 * when NEXT_PUBLIC_DEMO_MODE=true. Cannot be dismissed — always visible
 * so viewers never mistake demo data for real patient information.
 */

export function DemoModeBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Demo mode active"
      className="
        w-full bg-amber-500 text-white text-center
        py-1.5 px-4 text-xs font-semibold tracking-wider
        select-none shrink-0 z-50
      "
    >
      DEMO MODE — All data is synthetic. Do not enter real patient information.
    </div>
  );
}
