'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Bell,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface Reminder {
  id: string;
  patientId: string;
  screeningType: string;
  title: string;
  description: string | null;
  recommendedBy: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  guidelineSource: string | null;
  evidenceLevel: string | null;
  preventionPlanId: string | null;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  resultNotes: string | null;
  dismissedAt: string | null;
  dismissalReason: string | null;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  preventionPlan: {
    id: string;
    planType: string;
    status: string;
  } | null;
}

interface Stats {
  total: number;
  overdue: number;
  upcoming: number;
  completedThisMonth: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalFiltered: number;
  totalPages: number;
}

const STATUS_OPTIONS_KEYS = [
  { value: '', key: 'allStatuses' },
  { value: 'DUE', key: 'statusDue' },
  { value: 'OVERDUE', key: 'statusOverdue' },
  { value: 'SCHEDULED', key: 'statusScheduled' },
  { value: 'COMPLETED', key: 'statusCompleted' },
  { value: 'DISMISSED', key: 'statusDismissed' },
  { value: 'DECLINED', key: 'statusDeclined' },
] as const;

const PRIORITY_OPTIONS_KEYS = [
  { value: '', key: 'allPriorities' },
  { value: 'CRITICAL', key: 'priorityCritical' },
  { value: 'HIGH', key: 'priorityHigh' },
  { value: 'MEDIUM', key: 'priorityMedium' },
  { value: 'LOW', key: 'priorityLow' },
] as const;

export default function RemindersPage() {
  const t = useTranslations('portal.preventionReminders');
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, overdue: 0, upcoming: 0, completedThisMonth: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, totalFiltered: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dismissModal, setDismissModal] = useState<{ id: string; title: string } | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const fetchReminders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      params.set('page', String(page));
      params.set('limit', '50');

      const response = await fetch(`/api/prevention/reminders?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load reminders');
      }

      setReminders(result.data.reminders);
      setStats(result.data.stats);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleAction = async (reminderId: string, action: 'complete' | 'dismiss' | 'schedule', reason?: string) => {
    try {
      setActionLoading(reminderId);

      const response = await fetch('/api/prevention/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, action, reason }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh list
      await fetchReminders(pagination.page);
      setDismissModal(null);
      setDismissReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar recordatorio');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      DUE: { label: 'Pendiente', color: 'bg-blue-100 text-blue-700' },
      OVERDUE: { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
      SCHEDULED: { label: 'Programado', color: 'bg-amber-100 text-amber-700' },
      COMPLETED: { label: 'Completado', color: 'bg-green-100 text-green-700' },
      NOT_INDICATED: { label: 'No Indicado', color: 'bg-gray-100 text-gray-700' },
      DECLINED: { label: 'Rechazado', color: 'bg-gray-100 text-gray-500' },
      DISMISSED: { label: 'Descartado', color: 'bg-gray-100 text-gray-500' },
    };
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      CRITICAL: { label: 'Critica', color: 'bg-red-600 text-white' },
      HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
      MEDIUM: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
      LOW: { label: 'Baja', color: 'bg-blue-100 text-blue-700' },
    };
    const badge = badges[priority] || { label: priority, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d atrasado`;
    if (diffDays === 0) return 'Hoy';
    return `En ${diffDays}d`;
  };

  // Client-side search filter
  const displayedReminders = searchTerm
    ? reminders.filter(
        (r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${r.patient.firstName} ${r.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.screeningType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : reminders;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard/prevention')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Bell className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {(statusFilter || priorityFilter) && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                  {(statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUS_OPTIONS_KEYS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioridad
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PRIORITY_OPTIONS_KEYS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Recordatorios</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.overdue}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Atrasados</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcoming}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Próximos (7 días)</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedThisMonth}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completados (mes)</p>
          </div>
        </div>

        {/* Loading / Error / Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Cargando recordatorios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={() => fetchReminders()}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : displayedReminders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No se encontraron recordatorios
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {statusFilter || priorityFilter || searchTerm
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay recordatorios de cuidado preventivo registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Reminders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recordatorio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioridad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedReminders.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {reminder.patient.firstName} {reminder.patient.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{reminder.title}</div>
                          {reminder.guidelineSource && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {reminder.guidelineSource}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            {reminder.screeningType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{formatDate(reminder.dueDate)}</div>
                          <div className={`text-xs mt-0.5 ${
                            reminder.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'
                          }`}>
                            {getDaysUntil(reminder.dueDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(reminder.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(reminder.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(reminder.status === 'DUE' || reminder.status === 'OVERDUE' || reminder.status === 'SCHEDULED') && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleAction(reminder.id, 'complete')}
                                disabled={actionLoading === reminder.id}
                                className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {actionLoading === reminder.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Completar'
                                )}
                              </button>
                              <button
                                onClick={() => setDismissModal({ id: reminder.id, title: reminder.title })}
                                disabled={actionLoading === reminder.id}
                                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Descartar
                              </button>
                              {reminder.preventionPlan && (
                                <button
                                  onClick={() => router.push(`/dashboard/prevention/plans`)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Ver plan de prevención"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalFiltered)} de {pagination.totalFiltered}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchReminders(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchReminders(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dismiss Modal */}
      {dismissModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Descartar Recordatorio</h3>
              <button
                onClick={() => { setDismissModal(null); setDismissReason(''); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {dismissModal.title}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Razón (Opcional)
              </label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Indica la razón del descarte..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setDismissModal(null); setDismissReason(''); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAction(dismissModal.id, 'dismiss', dismissReason)}
                disabled={actionLoading === dismissModal.id}
                className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === dismissModal.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Descartar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
