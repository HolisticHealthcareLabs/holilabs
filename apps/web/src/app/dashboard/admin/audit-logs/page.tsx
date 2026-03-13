'use client';

/**
 * Audit Log Viewer
 *
 * HIPAA-compliant audit log viewer with:
 * - Real-time filtering and search
 * - Date range selection
 * - Action type filtering
 * - Resource filtering
 * - User filtering
 * - Export to CSV
 * - Detailed view with expandable details
 * - Pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  dataHash: string | null;
  success: boolean;
  errorMessage: string | null;
}

interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_TYPES = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'PRINT',
  'DEIDENTIFY',
  'REIDENTIFY',
  'PRESCRIBE',
  'SIGN',
  'REVOKE',
  'NOTIFY',
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  READ: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  EXPORT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  PRINT: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  DEIDENTIFY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  REIDENTIFY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PRESCRIBE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  SIGN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  REVOKE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  NOTIFY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function AuditLogsPage() {
  const t = useTranslations('dashboard.auditLogs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [successFilter, setSuccessFilter] = useState<string>('');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (action) params.append('action', action);
      if (resource) params.append('resource', resource);
      if (userEmail) params.append('userEmail', userEmail);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (successFilter !== '') params.append('success', successFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);

      if (!res.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditLogResponse = await res.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, action, resource, userEmail, startDate, endDate, successFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset filters
  const resetFilters = () => {
    setAction('');
    setResource('');
    setUserEmail('');
    setStartDate('');
    setEndDate('');
    setSuccessFilter('');
    setPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'User Email',
      'IP Address',
      'Action',
      'Resource',
      'Resource ID',
      'Success',
      'Error Message',
    ];

    const rows = logs.map((log) => [
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      log.userEmail || 'N/A',
      log.ipAddress || 'N/A',
      log.action,
      log.resource,
      log.resourceId,
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('filters')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('action')}
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('allActions')}</option>
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('resource')}
              </label>
              <input
                type="text"
                value={resource}
                onChange={(e) => {
                  setResource(e.target.value);
                  setPage(1);
                }}
                placeholder={t('resourcePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* User Email Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('userEmail')}
              </label>
              <input
                type="text"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setPage(1);
                }}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Success Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('status')}
              </label>
              <select
                value={successFilter}
                onChange={(e) => {
                  setSuccessFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('all')}</option>
                <option value="true">{t('success')}</option>
                <option value="false">{t('failed')}</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('resetFilters')}
            </button>
            <button
              onClick={exportToCSV}
              disabled={logs.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('exportCsv')}
            </button>
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {t('totalLogs', { count: pagination.total })}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Logs Table */}
        {!loading && !error && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {/* Decorative - low contrast intentional for table headers with uppercase tracking-wider */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('timestamp')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('action')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('resource')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('ipAddress')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          {t('noLogsFound')}
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <>
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {log.userEmail || t('system')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="font-medium">{log.resource}</div>
                              {/* Decorative - low contrast intentional for ID metadata */}
                              <div className="text-gray-500 dark:text-gray-400 text-xs">
                                ID: {log.resourceId}
                              </div>
                            </td>
                            {/* Decorative - low contrast intentional for IP address metadata */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {log.ipAddress || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.success ? (
                                <span className="flex items-center text-green-600 dark:text-green-400 text-sm">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {t('success')}
                                </span>
                              ) : (
                                <span className="flex items-center text-red-600 dark:text-red-400 text-sm">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {t('failed')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() =>
                                  setExpandedLog(expandedLog === log.id ? null : log.id)
                                }
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                              >
                                {expandedLog === log.id ? t('hideDetails') : t('viewDetails')}
                              </button>
                            </td>
                          </tr>
                          {expandedLog === log.id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                      {t('additionalDetails')}
                                    </h4>
                                    <dl className="grid grid-cols-2 gap-4">
                                      <div>
                                        {/* Decorative - low contrast intentional for metadata labels */}
                                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                          {t('userId')}
                                        </dt>
                                        <dd className="text-sm text-gray-900 dark:text-white">
                                          {log.userId || 'N/A'}
                                        </dd>
                                      </div>
                                      <div>
                                        {/* Decorative - low contrast intentional for metadata labels */}
                                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                          {t('userAgent')}
                                        </dt>
                                        <dd className="text-sm text-gray-900 dark:text-white break-all">
                                          {log.userAgent || 'N/A'}
                                        </dd>
                                      </div>
                                      {log.errorMessage && (
                                        <div className="col-span-2">
                                          {/* Decorative - low contrast intentional for metadata labels */}
                                          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('errorMessage')}
                                          </dt>
                                          <dd className="text-sm text-red-600 dark:text-red-400">
                                            {log.errorMessage}
                                          </dd>
                                        </div>
                                      )}
                                      {log.dataHash && (
                                        <div className="col-span-2">
                                          {/* Decorative - low contrast intentional for metadata labels */}
                                          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('dataHash')}
                                          </dt>
                                          <dd className="text-sm text-gray-900 dark:text-white font-mono">
                                            {log.dataHash}
                                          </dd>
                                        </div>
                                      )}
                                    </dl>
                                  </div>
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                      {t('eventDetails')}
                                    </h4>
                                      <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-sm mt-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('showingPage', { page: pagination.page, total: pagination.totalPages })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('previous')}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pageLabel', { page })}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
