"use strict";
/**
 * Base Skeleton Components
 * Reusable loading skeleton primitives
 */
'use client';
/**
 * Base Skeleton Components
 * Reusable loading skeleton primitives
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkeletonBox = SkeletonBox;
exports.SkeletonText = SkeletonText;
exports.SkeletonCard = SkeletonCard;
exports.SkeletonTable = SkeletonTable;
exports.SkeletonAvatar = SkeletonAvatar;
exports.SkeletonButton = SkeletonButton;
function SkeletonBox({ className = '' }) {
    return (<div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] ${className}`} style={{
            animation: 'shimmer 2s infinite',
        }}>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>);
}
function SkeletonText({ lines = 3, className = '', }) {
    return (<div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (<SkeletonBox key={i} className={`h-4 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}/>))}
    </div>);
}
function SkeletonCard({ className = '' }) {
    return (<div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <SkeletonBox className="h-6 w-1/3 rounded mb-4"/>
      <SkeletonText lines={3}/>
    </div>);
}
function SkeletonTable({ rows = 5, columns = 4, }) {
    return (<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (<SkeletonBox key={i} className="h-5 rounded"/>))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (<div key={rowIndex} className="border-b border-gray-100 dark:border-gray-700 p-4 last:border-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (<SkeletonBox key={colIndex} className="h-4 rounded"/>))}
          </div>
        </div>))}
    </div>);
}
function SkeletonAvatar({ size = 'md' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };
    return <SkeletonBox className={`${sizeClasses[size]} rounded-full`}/>;
}
function SkeletonButton({ className = '' }) {
    return <SkeletonBox className={`h-10 w-32 rounded-lg ${className}`}/>;
}
//# sourceMappingURL=SkeletonBase.js.map