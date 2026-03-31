/**
 * Loading Skeleton Components
 *
 * Provides skeleton screens for better perceived performance
 */

export function CardSkeleton() {
  return (
    <div className="p-6 animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-sm)', border: '1px solid var(--border-default)' }}>
      <div className="h-4 w-3/4 mb-4" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      <div className="h-3 w-1/2 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      <div className="h-3 w-2/3" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-4 animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex-shrink-0" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}></div>
        <div className="flex-1">
          <div className="h-4 w-3/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
          <div className="h-3 w-1/2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-16" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </td>
    </tr>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="p-6 animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-sm)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}></div>
        <div className="h-6 w-16" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </div>
      <div className="h-4 w-3/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      <div className="h-3 w-1/2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="overflow-hidden animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-sm)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="h-32" style={{ backgroundColor: 'var(--border-default)' }}></div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Profile info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-full)' }}></div>
          <div className="flex-1">
            <div className="h-6 w-1/3 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
            <div className="h-4 w-1/4" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <div className="h-3 w-1/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
            <div className="h-4 w-2/3" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
          </div>
          <div>
            <div className="h-3 w-1/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
            <div className="h-4 w-1/2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
          </div>
          <div>
            <div className="h-3 w-1/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
            <div className="h-4 w-3/4" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-6 animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-sm)', border: '1px solid var(--border-default)' }}>
      <div className="h-5 w-1/3 mb-4" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      <div className="h-64" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-sm)', border: '1px solid var(--border-default)' }}>
      <div>
        <div className="h-4 w-1/4 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
        <div className="h-10 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </div>
      <div>
        <div className="h-4 w-1/3 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
        <div className="h-10 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </div>
      <div>
        <div className="h-4 w-1/5 mb-2" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
        <div className="h-24 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </div>
      <div className="flex gap-3 pt-4">
        <div className="h-10 flex-1" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
        <div className="h-10 flex-1" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}></div>
      </div>
    </div>
  );
}

/**
 * Generic skeleton wrapper
 */
export function Skeleton({
  className = '',
  width = 'w-full',
  height = 'h-4',
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`animate-pulse ${width} ${height} ${className}`}
      style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}
    />
  );
}
