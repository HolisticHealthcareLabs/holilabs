"use strict";
/**
 * Skeleton Loader Components
 *
 * Reusable skeleton loaders for different content types
 * Provides visual feedback while content is loading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSkeleton = CardSkeleton;
exports.TableRowSkeleton = TableRowSkeleton;
exports.TableSkeleton = TableSkeleton;
exports.ListSkeleton = ListSkeleton;
exports.FormSkeleton = FormSkeleton;
exports.PatientCardSkeleton = PatientCardSkeleton;
exports.DashboardSkeleton = DashboardSkeleton;
exports.LoadingSpinner = LoadingSpinner;
exports.FullPageLoader = FullPageLoader;
exports.InlineLoader = InlineLoader;
const framer_motion_1 = require("framer-motion");
function CardSkeleton() {
    return (<div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg"/>
        <div className="w-16 h-6 bg-gray-200 rounded"/>
      </div>
      <div className="space-y-3">
        <div className="w-24 h-4 bg-gray-200 rounded"/>
        <div className="w-32 h-8 bg-gray-200 rounded"/>
        <div className="w-40 h-3 bg-gray-200 rounded"/>
      </div>
    </div>);
}
function TableRowSkeleton() {
    return (<tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"/>
          <div className="space-y-2">
            <div className="w-32 h-4 bg-gray-200 rounded"/>
            <div className="w-24 h-3 bg-gray-200 rounded"/>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="w-20 h-6 bg-gray-200 rounded-full"/>
      </td>
      <td className="px-6 py-4">
        <div className="w-24 h-4 bg-gray-200 rounded"/>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-8 bg-gray-200 rounded"/>
          <div className="w-16 h-8 bg-gray-200 rounded"/>
        </div>
      </td>
    </tr>);
}
function TableSkeleton({ rows = 5 }) {
    return (<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"/>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"/>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"/>
              </th>
              <th className="px-6 py-3 text-right">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse ml-auto"/>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, i) => (<TableRowSkeleton key={i}/>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function ListSkeleton({ items = 5 }) {
    return (<div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (<div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-gray-200 rounded"/>
              <div className="w-1/2 h-3 bg-gray-200 rounded"/>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded"/>
          </div>
        </div>))}
    </div>);
}
function FormSkeleton() {
    return (<div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="w-32 h-5 bg-gray-200 rounded"/>
        <div className="w-full h-10 bg-gray-200 rounded"/>
      </div>
      <div className="space-y-4">
        <div className="w-32 h-5 bg-gray-200 rounded"/>
        <div className="w-full h-10 bg-gray-200 rounded"/>
      </div>
      <div className="space-y-4">
        <div className="w-32 h-5 bg-gray-200 rounded"/>
        <div className="w-full h-24 bg-gray-200 rounded"/>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-10 bg-gray-200 rounded"/>
        <div className="w-32 h-10 bg-gray-200 rounded"/>
      </div>
    </div>);
}
function PatientCardSkeleton() {
    return (<div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <div className="w-40 h-5 bg-gray-200 rounded"/>
          <div className="w-32 h-4 bg-gray-200 rounded"/>
          <div className="w-48 h-4 bg-gray-200 rounded"/>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="space-y-2">
          <div className="w-16 h-3 bg-gray-200 rounded"/>
          <div className="w-20 h-5 bg-gray-200 rounded"/>
        </div>
        <div className="space-y-2">
          <div className="w-16 h-3 bg-gray-200 rounded"/>
          <div className="w-20 h-5 bg-gray-200 rounded"/>
        </div>
        <div className="space-y-2">
          <div className="w-16 h-3 bg-gray-200 rounded"/>
          <div className="w-20 h-5 bg-gray-200 rounded"/>
        </div>
      </div>
    </div>);
}
function DashboardSkeleton() {
    return (<div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (<CardSkeleton key={i}/>))}
      </div>

      {/* Chart Area */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-4"/>
        <div className="w-full h-64 bg-gray-200 rounded"/>
      </div>

      {/* Table */}
      <TableSkeleton rows={5}/>
    </div>);
}
function LoadingSpinner({ size = 'md', color = 'border-blue-600' }) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-4',
    };
    return (<div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent ${color}`}/>);
}
function FullPageLoader({ message = 'Cargando...' }) {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <LoadingSpinner size="lg"/>
        <p className="text-gray-600 mt-4 text-lg">{message}</p>
      </framer_motion_1.motion.div>
    </div>);
}
function InlineLoader({ message }) {
    return (<div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="md"/>
        {message && <p className="text-gray-600 mt-2 text-sm">{message}</p>}
      </div>
    </div>);
}
//# sourceMappingURL=SkeletonLoader.js.map