'use client';

/**
 * Quick Actions Panel
 *
 * Provides shortcuts for common prevention-related actions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Copy,
  FileText,
  Search,
  Shield,
  Download,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  BarChart3,
  User,
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionsPanelProps {
  showTitle?: boolean;
  maxActions?: number;
  orientation?: 'horizontal' | 'vertical';
}

export default function QuickActionsPanel({
  showTitle = true,
  maxActions,
  orientation = 'horizontal',
}: QuickActionsPanelProps) {
  const router = useRouter();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const actions: QuickAction[] = [
    {
      id: 'create-plan',
      title: 'Crear Plan',
      description: 'Crear un nuevo plan de prevención',
      icon: <Plus className="w-6 h-6" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/dashboard/prevention/plans/new',
    },
    {
      id: 'use-template',
      title: 'Usar Plantilla',
      description: 'Crear plan desde plantilla',
      icon: <Copy className="w-6 h-6" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      href: '/dashboard/prevention/templates',
    },
    {
      id: 'view-plans',
      title: 'Ver Planes',
      description: 'Ver todos los planes activos',
      icon: <FileText className="w-6 h-6" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      href: '/dashboard/prevention/plans',
    },
    {
      id: 'search',
      title: 'Búsqueda Avanzada',
      description: 'Buscar en planes y plantillas',
      icon: <Search className="w-6 h-6" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      href: '/dashboard/prevention/search',
    },
    {
      id: 'audit-logs',
      title: 'Registro de Auditoría',
      description: 'Ver historial de cambios',
      icon: <Shield className="w-6 h-6" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      href: '/dashboard/prevention/audit',
    },
    {
      id: 'analytics',
      title: 'Analíticas',
      description: 'Ver métricas y reportes',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      href: '/dashboard/prevention/analytics',
    },
    {
      id: 'reminders',
      title: 'Recordatorios',
      description: 'Gestionar recordatorios preventivos',
      icon: <Calendar className="w-6 h-6" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      href: '/dashboard/prevention/reminders',
    },
    {
      id: 'goals',
      title: 'Metas',
      description: 'Seguimiento de metas',
      icon: <Target className="w-6 h-6" />,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      href: '/dashboard/prevention/goals',
    },
    {
      id: 'recent-activity',
      title: 'Actividad Reciente',
      description: 'Ver cambios recientes',
      icon: <Clock className="w-6 h-6" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      href: '/dashboard/prevention/activity',
    },
    {
      id: 'trends',
      title: 'Tendencias',
      description: 'Análisis de tendencias',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      href: '/dashboard/prevention/trends',
    },
    {
      id: 'patients',
      title: 'Pacientes',
      description: 'Ver pacientes con planes activos',
      icon: <User className="w-6 h-6" />,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      href: '/dashboard/prevention/patients',
    },
    {
      id: 'export',
      title: 'Exportar Datos',
      description: 'Exportar planes y reportes',
      icon: <Download className="w-6 h-6" />,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      onClick: () => {
        // Placeholder for export functionality
        alert('Funcionalidad de exportación en desarrollo');
      },
    },
  ];

  const displayActions = maxActions ? actions.slice(0, maxActions) : actions;

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  const gridCols = orientation === 'horizontal'
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-1';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {showTitle && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Acciones Rápidas
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Atajos para tareas comunes de prevención
          </p>
        </div>
      )}

      <div className={`grid ${gridCols} gap-4`}>
        {displayActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            onMouseEnter={() => setHoveredAction(action.id)}
            onMouseLeave={() => setHoveredAction(null)}
            className={`
              ${action.bgColor}
              ${hoveredAction === action.id ? 'scale-105 shadow-md' : ''}
              p-4 rounded-xl border-2 border-transparent
              hover:border-current transition-all duration-200
              text-left group relative overflow-hidden
            `}
          >
            {/* Background gradient on hover */}
            <div
              className={`
                absolute inset-0 opacity-0 group-hover:opacity-10
                bg-gradient-to-br from-current to-transparent
                transition-opacity duration-200
              `}
            />

            <div className="relative z-10">
              <div className={`${action.color} mb-3`}>
                {action.icon}
              </div>
              <h4 className={`font-semibold text-gray-900 dark:text-white mb-1 text-sm`}>
                {action.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {action.description}
              </p>
            </div>

            {/* Arrow indicator on hover */}
            <div
              className={`
                absolute bottom-2 right-2 opacity-0 group-hover:opacity-100
                transition-opacity duration-200
              `}
            >
              <svg
                className={`w-4 h-4 ${action.color}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {maxActions && actions.length > maxActions && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/dashboard/prevention')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver todas las acciones →
          </button>
        </div>
      )}
    </div>
  );
}
