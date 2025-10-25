"use strict";
/**
 * Loading Skeleton Components
 *
 * Provides skeleton screens for better perceived performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSkeleton = CardSkeleton;
exports.ListItemSkeleton = ListItemSkeleton;
exports.TableRowSkeleton = TableRowSkeleton;
exports.DashboardCardSkeleton = DashboardCardSkeleton;
exports.ProfileSkeleton = ProfileSkeleton;
exports.ChartSkeleton = ChartSkeleton;
exports.FormSkeleton = FormSkeleton;
exports.Skeleton = Skeleton;
function CardSkeleton() {
    return (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>);
}
function ListItemSkeleton() {
    return (<div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>);
}
function TableRowSkeleton() {
    return (<tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
    </tr>);
}
function DashboardCardSkeleton() {
    return (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>);
}
function ProfileSkeleton() {
    return (<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="h-32 bg-gray-200"></div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Profile info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>);
}
function ChartSkeleton() {
    return (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>);
}
function FormSkeleton() {
    return (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 animate-pulse">
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/5 mb-2"></div>
        <div className="h-24 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
      </div>
    </div>);
}
/**
 * Generic skeleton wrapper
 */
function Skeleton({ className = '', width = 'w-full', height = 'h-4', }) {
    return (<div className={`bg-gray-200 rounded animate-pulse ${width} ${height} ${className}`}/>);
}
//# sourceMappingURL=LoadingSkeleton.js.map