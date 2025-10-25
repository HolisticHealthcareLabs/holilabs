"use strict";
/**
 * Scribe/SOAP Editor Page Skeleton
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScribeSkeleton = ScribeSkeleton;
const SkeletonBase_1 = require("./SkeletonBase");
function ScribeSkeleton() {
    return (<div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <SkeletonBase_1.SkeletonBox className="h-10 w-64 rounded mb-2"/>
          <SkeletonBase_1.SkeletonBox className="h-5 w-96 rounded"/>
        </div>
        <div className="flex gap-2">
          <SkeletonBase_1.SkeletonBox className="h-10 w-32 rounded-lg"/>
          <SkeletonBase_1.SkeletonBox className="h-10 w-32 rounded-lg"/>
        </div>
      </div>

      {/* Patient Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <SkeletonBase_1.SkeletonBox className="w-12 h-12 rounded-full"/>
          <div className="flex-1">
            <SkeletonBase_1.SkeletonBox className="h-6 w-48 rounded mb-2"/>
            <div className="flex gap-4">
              <SkeletonBase_1.SkeletonBox className="h-4 w-24 rounded"/>
              <SkeletonBase_1.SkeletonBox className="h-4 w-24 rounded"/>
              <SkeletonBase_1.SkeletonBox className="h-4 w-32 rounded"/>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <SkeletonBase_1.SkeletonBox className="h-6 w-48 rounded"/>
          <SkeletonBase_1.SkeletonBox className="h-5 w-32 rounded"/>
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBase_1.SkeletonBox className="w-16 h-16 rounded-full"/>
          <div className="flex-1">
            <SkeletonBase_1.SkeletonBox className="h-2 w-full rounded mb-2"/>
            <SkeletonBase_1.SkeletonBox className="h-4 w-24 rounded"/>
          </div>
          <div className="flex gap-2">
            <SkeletonBase_1.SkeletonBox className="h-10 w-10 rounded-lg"/>
            <SkeletonBase_1.SkeletonBox className="h-10 w-10 rounded-lg"/>
          </div>
        </div>
      </div>

      {/* SOAP Note Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjective Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBase_1.SkeletonBox className="w-8 h-8 rounded"/>
            <SkeletonBase_1.SkeletonBox className="h-6 w-32 rounded"/>
          </div>
          <SkeletonBase_1.SkeletonBox className="h-40 w-full rounded"/>
        </div>

        {/* Objective Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBase_1.SkeletonBox className="w-8 h-8 rounded"/>
            <SkeletonBase_1.SkeletonBox className="h-6 w-32 rounded"/>
          </div>
          <SkeletonBase_1.SkeletonBox className="h-40 w-full rounded"/>
        </div>

        {/* Assessment Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBase_1.SkeletonBox className="w-8 h-8 rounded"/>
            <SkeletonBase_1.SkeletonBox className="h-6 w-32 rounded"/>
          </div>
          <SkeletonBase_1.SkeletonBox className="h-40 w-full rounded mb-4"/>
          {/* Diagnoses */}
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (<div key={i} className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <SkeletonBase_1.SkeletonBox className="h-5 w-20 rounded"/>
                <SkeletonBase_1.SkeletonBox className="h-5 flex-1 rounded"/>
              </div>))}
          </div>
        </div>

        {/* Plan Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBase_1.SkeletonBox className="w-8 h-8 rounded"/>
            <SkeletonBase_1.SkeletonBox className="h-6 w-32 rounded"/>
          </div>
          <SkeletonBase_1.SkeletonBox className="h-40 w-full rounded mb-4"/>
          {/* Procedures */}
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (<div key={i} className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <SkeletonBase_1.SkeletonBox className="h-5 w-20 rounded"/>
                <SkeletonBase_1.SkeletonBox className="h-5 flex-1 rounded"/>
              </div>))}
          </div>
        </div>
      </div>

      {/* Vital Signs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <SkeletonBase_1.SkeletonBox className="h-6 w-32 rounded mb-4"/>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (<div key={i}>
              <SkeletonBase_1.SkeletonBox className="h-4 w-24 rounded mb-2"/>
              <SkeletonBase_1.SkeletonBox className="h-10 w-full rounded"/>
            </div>))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <SkeletonBase_1.SkeletonBox className="h-10 w-32 rounded-lg"/>
        <div className="flex gap-2">
          <SkeletonBase_1.SkeletonBox className="h-10 w-32 rounded-lg"/>
          <SkeletonBase_1.SkeletonBox className="h-10 w-32 rounded-lg"/>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=ScribeSkeleton.js.map