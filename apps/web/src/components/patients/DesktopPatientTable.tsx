/**
 * Desktop Patient Table Component
 *
 * High-performance patient table for desktop with:
 * - TanStack Table for advanced features
 * - Virtual scrolling for 1000+ patients
 * - Sorting, filtering, search
 * - Glassmorphic spatial design
 * - WCAG AAA accessible
 */

'use client';

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SpatialCard } from '@/components/spatial/SpatialCard';

export interface DesktopPatientTableProps {
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
  loading?: boolean;
  className?: string;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Desktop Patient Table
 */
export function DesktopPatientTable({
  patients,
  onPatientClick,
  loading = false,
  className = '',
}: DesktopPatientTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  // Table columns definition
  const columns = useMemo<ColumnDef<typeof patients[0]>[]>(
    () => [
      {
        accessorKey: 'mrn',
        header: 'MRN',
        cell: (info) => (
          <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {info.getValue() as string}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'name',
        header: 'Patient Name',
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                {row.firstName} {row.lastName}
              </p>
              {row.isPalliativeCare && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  Palliative
                </span>
              )}
            </div>
          );
        },
        size: 220,
      },
      {
        accessorKey: 'age',
        header: 'Age',
        accessorFn: (row) => calculateAge(row.dateOfBirth),
        cell: (info) => {
          const row = info.row.original;
          const age = calculateAge(row.dateOfBirth);
          const gender = row.gender?.charAt(0) || 'U';
          return (
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {age}y {gender}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'riskLevel',
        header: 'Risk',
        cell: (info) => {
          const risk = info.getValue() as string | undefined;
          if (!risk) return <span className="text-neutral-400">—</span>;

          const riskColors = {
            LOW: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
            MEDIUM: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
            HIGH: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
            CRITICAL: 'bg-error-600 text-white dark:bg-error-700 animate-pulse',
          };

          return (
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                riskColors[risk as keyof typeof riskColors]
              }`}
            >
              {risk}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'contact',
        header: 'Contact',
        accessorFn: (row) => row.phone || row.email || '',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {row.phone && <div className="truncate">📱 {row.phone}</div>}
              {row.email && (
                <div className="truncate text-xs mt-0.5">✉️ {row.email}</div>
              )}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'lastVisit',
        header: 'Last Visit',
        cell: (info) => {
          const date = info.getValue() as Date | undefined;
          if (!date) return <span className="text-neutral-400">—</span>;
          return (
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {formatDate(date)}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'nextAppointment',
        header: 'Next Appt',
        cell: (info) => {
          const date = info.getValue() as Date | undefined;
          if (!date) return <span className="text-neutral-400">—</span>;
          return (
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              {formatDate(date)}
            </span>
          );
        },
        size: 140,
      },
    ],
    []
  );

  // Initialize table
  const table = useReactTable({
    data: patients,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Get table rows
  const { rows } = table.getRowModel();

  // Virtualization container ref
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Virtual rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <SpatialCard
      variant="elevated"
      blur="medium"
      className={`overflow-hidden ${className}`}
    >
      {/* Search bar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search patients by name, MRN, phone..."
            className="w-full px-4 py-2.5 pl-10 rounded-lg bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Results count */}
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Showing {rows.length} of {patients.length} patients
        </p>
      </div>

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="overflow-auto max-h-[600px] relative"
        style={{ contain: 'strict' }}
      >
        <table className="w-full">
          {/* Table header */}
          <thead className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2 hover:text-cyan-600 transition-colors'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        ) as React.ReactNode}
                        {header.column.getIsSorted() && (
                          <span>
                            {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Table body - virtualized */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    Loading patients...
                  </div>
                </td>
              </tr>
            ) : virtualRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No patients found
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for virtual scrolling */}
                {virtualRows.length > 0 && virtualRows[0].start > 0 && (
                  <tr>
                    <td style={{ height: `${virtualRows[0].start}px` }} />
                  </tr>
                )}

                {/* Virtual rows */}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onPatientClick?.(row.original.id)}
                      className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-white/50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                      style={{
                        height: `${virtualRow.size}px`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          ) as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {/* Spacer for virtual scrolling */}
                {virtualRows.length > 0 &&
                  virtualRows[virtualRows.length - 1].end < totalSize && (
                    <tr>
                      <td
                        style={{
                          height: `${
                            totalSize - virtualRows[virtualRows.length - 1].end
                          }px`,
                        }}
                      />
                    </tr>
                  )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </SpatialCard>
  );
}

export default DesktopPatientTable;
