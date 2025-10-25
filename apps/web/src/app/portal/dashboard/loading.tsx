/**
 * Portal Dashboard Loading State
 *
 * Displays skeleton loaders while the dashboard data is being fetched
 */

import { PortalDashboardSkeleton } from '@/components/skeletons/PortalSkeletons';

export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PortalDashboardSkeleton />
    </div>
  );
}
