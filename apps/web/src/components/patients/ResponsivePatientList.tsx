/**
 * Responsive Patient List Component
 *
 * Automatically switches between mobile and desktop views:
 * - Mobile (< 768px): Touch-optimized card list with infinite scroll
 * - Desktop (≥ 768px): Advanced data table with virtualization
 *
 * Features:
 * - Responsive breakpoint detection
 * - Virtual scrolling for performance
 * - Glassmorphic spatial design
 * - WCAG AAA accessible
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MobilePatientCard } from './MobilePatientCard';
import { DesktopPatientTable } from './DesktopPatientTable';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface ResponsivePatientListProps {
  patients: Array<{
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender?: string;
    phone?: string;
    email?: string;
    isPalliativeCare?: boolean;
    lastVisit?: Date;
    nextAppointment?: Date;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  onPatientClick?: (patientId: string) => void;
  onPatientCall?: (patientId: string) => void;
  onPatientMessage?: (patientId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

/**
 * Hook to detect mobile/desktop breakpoint
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Responsive Patient List
 */
export function ResponsivePatientList({
  patients,
  onPatientClick,
  onPatientCall,
  onPatientMessage,
  loading = false,
  hasMore = false,
  onLoadMore,
  className = '',
}: ResponsivePatientListProps) {
  // Detect desktop breakpoint (md: 768px)
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Desktop view - Use table
  if (isDesktop) {
    return (
      <DesktopPatientTable
        patients={patients}
        onPatientClick={onPatientClick}
        loading={loading}
        className={className}
      />
    );
  }

  // Mobile view - Use card list with infinite scroll
  return (
    <MobilePatientList
      patients={patients}
      onPatientClick={onPatientClick}
      onPatientCall={onPatientCall}
      onPatientMessage={onPatientMessage}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      className={className}
    />
  );
}

/**
 * Mobile Patient List with Infinite Scroll
 */
function MobilePatientList({
  patients,
  onPatientClick,
  onPatientCall,
  onPatientMessage,
  loading,
  hasMore,
  onLoadMore,
  className,
}: ResponsivePatientListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Virtualization for mobile list
  const virtualizer = useVirtualizer({
    count: hasMore ? patients.length + 1 : patients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  // Infinite scroll - load more when near bottom
  React.useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= patients.length - 1 &&
      hasMore &&
      !loading &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [
    hasMore,
    loading,
    onLoadMore,
    patients.length,
    virtualizer.getVirtualItems(),
  ]);

  return (
    <div
      ref={parentRef}
      className={`overflow-auto h-[calc(100vh-200px)] ${className}`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > patients.length - 1;
          const patient = patients[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                hasMore ? (
                  <div className="p-4 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      Loading more patients...
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="px-4 py-2">
                  <MobilePatientCard
                    patient={patient}
                    onClick={() => onPatientClick?.(patient.id)}
                    onCall={
                      onPatientCall
                        ? () => onPatientCall(patient.id)
                        : undefined
                    }
                    onMessage={
                      onPatientMessage
                        ? () => onPatientMessage(patient.id)
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading initial data */}
      {loading && patients.length === 0 && (
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-neutral-500">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            Loading patients...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && patients.length === 0 && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            No patients found
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Try adjusting your search filters or add a new patient.
          </p>
        </div>
      )}
    </div>
  );
}

export default ResponsivePatientList;
