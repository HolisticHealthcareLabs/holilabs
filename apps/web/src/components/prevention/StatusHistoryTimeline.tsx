'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  User,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatusChangeEntry {
  timestamp: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  notes?: string;
}

interface StatusHistoryTimelineProps {
  statusHistory: StatusChangeEntry[];
  currentStatus: string;
  createdAt: string;
  completedAt?: string | null;
  deactivatedAt?: string | null;
}

const StatusHistoryTimeline: React.FC<StatusHistoryTimelineProps> = ({
  statusHistory,
  currentStatus,
  createdAt,
  completedAt,
  deactivatedAt,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Format timestamp to readable format
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      return timestamp;
    }
  };

  // Get icon for status
  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'DEACTIVATED':
        return <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'ACTIVE':
        return <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'DEACTIVATED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Get translated status label
  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'Completado';
      case 'DEACTIVATED':
        return 'Desactivado';
      case 'ACTIVE':
        return 'Activo';
      case 'PAUSED':
        return 'Pausado';
      case 'ARCHIVED':
        return 'Archivado';
      default:
        return status;
    }
  };

  // Get translated reason label
  const getReasonLabel = (reason: string) => {
    const reasonMap: Record<string, string> = {
      all_goals_met: 'Todas las metas cumplidas',
      patient_declined: 'Paciente declinó más intervenciones',
      transitioned_protocol: 'Transición a otro protocolo',
      no_longer_indicated: 'Ya no clínicamente indicado',
      patient_transferred: 'Paciente transferido a otro proveedor',
      duplicate_protocol: 'Protocolo duplicado',
      patient_declined_followup: 'Paciente declinó seguimiento',
      superseded: 'Reemplazado por protocolo más reciente',
      clinical_situation_changed: 'Situación clínica cambió',
      patient_returned: 'Paciente regresó a nuestra clínica',
      deactivation_error: 'Desactivación fue un error',
      new_evidence: 'Nueva evidencia clínica disponible',
      other: 'Otro',
    };
    return reasonMap[reason] || reason;
  };

  // Prepare timeline entries (combine creation + status changes)
  type TimelineEntry =
    | {
        timestamp: string;
        type: 'created';
        status: string;
        description: string;
      }
    | {
        timestamp: string;
        type: 'status_change';
        fromStatus: string;
        toStatus: string;
        reason?: string;
        notes?: string;
        userId: string;
      };

  const timelineEntries: TimelineEntry[] = [
    {
      timestamp: createdAt,
      type: 'created',
      status: 'ACTIVE',
      description: 'Plan creado',
    },
    ...statusHistory.map((change) => ({
      timestamp: change.timestamp,
      type: 'status_change' as const,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      reason: change.reason,
      notes: change.notes,
      userId: change.userId,
    })),
  ];

  // Sort by timestamp (most recent first)
  timelineEntries.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Show only first 3 entries unless expanded
  const displayedEntries = isExpanded ? timelineEntries : timelineEntries.slice(0, 3);
  const hasMoreEntries = timelineEntries.length > 3;

  if (timelineEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historial de Estado
          </h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {timelineEntries.length} {timelineEntries.length === 1 ? 'entrada' : 'entradas'}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-6">
          {displayedEntries.map((entry, index) => (
            <div key={index} className="relative flex items-start space-x-4">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  {entry.type === 'created' ? (
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    getStatusIcon(entry.toStatus)
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Main info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {entry.type === 'created' ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Plan creado
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor('ACTIVE')}`}
                        >
                          {getStatusLabel('ACTIVE')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Estado cambió de
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.fromStatus)}`}
                        >
                          {getStatusLabel(entry.fromStatus)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">a</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.toStatus)}`}
                        >
                          {getStatusLabel(entry.toStatus)}
                        </span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    {/* Reason */}
                    {entry.type === 'status_change' && entry.reason && (
                      <div className="flex items-start space-x-2 mt-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {getReasonLabel(entry.reason)}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {entry.type === 'status_change' && entry.notes && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {entry.notes}
                        </p>
                      </div>
                    )}

                    {/* User ID (for debugging - could be replaced with user name lookup) */}
                    {entry.type === 'status_change' && entry.userId && (
                      <div className="flex items-center space-x-1 mt-1">
                        {/* Decorative - low contrast intentional for metadata */}
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Por: {entry.userId.substring(0, 8)}...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse button */}
        {hasMoreEntries && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 transform rotate-180" />
                <span>Mostrar menos</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>
                  Mostrar {timelineEntries.length - 3} {timelineEntries.length - 3 === 1 ? 'entrada más' : 'entradas más'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Estado actual:{' '}
          <span
            className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(currentStatus)}`}
          >
            {getStatusLabel(currentStatus)}
          </span>
        </div>
        {/* Decorative - low contrast intentional for timestamps */}
        {(completedAt || deactivatedAt) && (
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {completedAt && `Completado: ${formatTimestamp(completedAt)}`}
            {deactivatedAt && `Desactivado: ${formatTimestamp(deactivatedAt)}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusHistoryTimeline;
