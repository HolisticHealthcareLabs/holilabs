'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CarePlan {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  goals: string[];
  progressNotes?: string[];
  targetDate?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignedTeam?: string[];
}

interface CarePlansTabProps {
  carePlans: CarePlan[];
  patientId: string;
  onRefresh?: () => void;
}

export default function CarePlansTab({
  carePlans,
  patientId,
  onRefresh,
}: CarePlansTabProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Filter care plans
  const filteredPlans = carePlans.filter((plan) => {
    if (selectedStatus !== 'all' && plan.status !== selectedStatus) return false;
    if (selectedCategory !== 'all' && plan.category !== selectedCategory) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      PAIN_MANAGEMENT: '😣',
      SYMPTOM_CONTROL: '🩺',
      PSYCHOSOCIAL_SUPPORT: '💚',
      SPIRITUAL_CARE: '🙏',
      FAMILY_SUPPORT: '👨‍👩‍👧',
      QUALITY_OF_LIFE: '💫',
      END_OF_LIFE_PLANNING: '🕊️',
      MOBILITY: '🚶',
      NUTRITION: '🍎',
      WOUND_CARE: '🩹',
    };
    return icons[category] || '📋';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      PAIN_MANAGEMENT: 'Manejo del Dolor',
      SYMPTOM_CONTROL: 'Control de Síntomas',
      PSYCHOSOCIAL_SUPPORT: 'Apoyo Psicosocial',
      SPIRITUAL_CARE: 'Cuidado Espiritual',
      FAMILY_SUPPORT: 'Apoyo Familiar',
      QUALITY_OF_LIFE: 'Calidad de Vida',
      END_OF_LIFE_PLANNING: 'Planificación Final de Vida',
      MOBILITY: 'Movilidad',
      NUTRITION: 'Nutrición',
      WOUND_CARE: 'Cuidado de Heridas',
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: 'red',
      HIGH: 'orange',
      MEDIUM: 'yellow',
      LOW: 'green',
    };
    return colors[priority] || 'gray';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'green',
      COMPLETED: 'blue',
      ON_HOLD: 'yellow',
      DISCONTINUED: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      COMPLETED: 'Completado',
      ON_HOLD: 'En Espera',
      DISCONTINUED: 'Discontinuado',
    };
    return labels[status] || status;
  };

  // Group by category
  const categories = Array.from(new Set(carePlans.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="mr-2">📋</span>
            Planes de Atención ({filteredPlans.length})
          </h3>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            ➕ Nuevo Plan de Atención
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="ACTIVE">Activo</option>
              <option value="COMPLETED">Completado</option>
              <option value="ON_HOLD">En Espera</option>
              <option value="DISCONTINUED">Discontinuado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Care Plans List */}
      {filteredPlans.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Sin planes de atención</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay planes de atención que coincidan con los filtros seleccionados.
          </p>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            ➕ Crear Primer Plan de Atención
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            const priorityColor = getPriorityColor(plan.priority);
            const statusColor = getStatusColor(plan.status);

            return (
              <div
                key={plan.id}
                className={`bg-white border-2 ${
                  isExpanded ? `border-${statusColor}-400` : 'border-gray-200'
                } rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden`}
              >
                {/* Plan Header */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full p-5 text-left flex items-start space-x-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Category Icon */}
                  <div className="text-4xl flex-shrink-0">
                    {getCategoryIcon(plan.category)}
                  </div>

                  {/* Plan Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{plan.title}</h4>
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Priority Badge */}
                        <span className={`px-2 py-1 bg-${priorityColor}-100 border border-${priorityColor}-300 text-${priorityColor}-900 text-xs font-bold rounded-full`}>
                          {plan.priority}
                        </span>
                        {/* Status Badge */}
                        <span className={`px-2 py-1 bg-${statusColor}-100 border border-${statusColor}-300 text-${statusColor}-900 text-xs font-bold rounded-full`}>
                          {getStatusLabel(plan.status)}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      {getCategoryLabel(plan.category)}
                    </div>

                    {plan.description && (
                      <p className="text-sm text-gray-700 line-clamp-2">{plan.description}</p>
                    )}

                    {/* Decorative - low contrast intentional for metadata counts */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>🎯 {plan.goals.length} objetivo(s)</span>
                      {plan.targetDate && (
                        <span>
                          📅 Meta:{' '}
                          {format(
                            typeof plan.targetDate === 'string'
                              ? parseISO(plan.targetDate)
                              : plan.targetDate,
                            'dd/MM/yyyy',
                            { locale: es }
                          )}
                        </span>
                      )}
                      {plan.assignedTeam && plan.assignedTeam.length > 0 && (
                        <span>👥 {plan.assignedTeam.length} miembro(s) del equipo</span>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {isExpanded ? '🔼' : '🔽'}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-200 pt-4">
                    {/* Goals */}
                    {plan.goals.length > 0 && (
                      <div>
                        <h5 className="text-sm font-bold text-gray-900 mb-2">🎯 Objetivos del Plan:</h5>
                        <ul className="space-y-2">
                          {plan.goals.map((goal, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm">
                              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                              <span className="text-gray-700">{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Progress Notes */}
                    {plan.progressNotes && plan.progressNotes.length > 0 && (
                      <div>
                        <h5 className="text-sm font-bold text-gray-900 mb-2">📝 Notas de Progreso:</h5>
                        <div className="space-y-2">
                          {plan.progressNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    {/* Decorative - low contrast intentional for metadata timestamps */}
                    <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200">
                      <span>
                        Creado:{' '}
                        {format(
                          typeof plan.createdAt === 'string'
                            ? parseISO(plan.createdAt)
                            : plan.createdAt,
                          "dd/MM/yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </span>
                      <span>
                        Actualizado:{' '}
                        {format(
                          typeof plan.updatedAt === 'string'
                            ? parseISO(plan.updatedAt)
                            : plan.updatedAt,
                          "dd/MM/yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-3">
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                        ✏️ Editar Plan
                      </button>
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                        ➕ Agregar Nota de Progreso
                      </button>
                      {plan.status === 'ACTIVE' && (
                        <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-semibold">
                          ✓ Marcar Completado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Statistics */}
      {carePlans.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-4">📊 Estadísticas de Planes</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="text-xs text-purple-700 font-semibold mb-1">Total de Planes</div>
              <div className="text-3xl font-bold text-purple-900">{carePlans.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-xs text-green-700 font-semibold mb-1">Planes Activos</div>
              <div className="text-3xl font-bold text-green-900">
                {carePlans.filter((p) => p.status === 'ACTIVE').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 font-semibold mb-1">Completados</div>
              <div className="text-3xl font-bold text-blue-900">
                {carePlans.filter((p) => p.status === 'COMPLETED').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="text-xs text-red-700 font-semibold mb-1">Urgentes</div>
              <div className="text-3xl font-bold text-red-900">
                {carePlans.filter((p) => p.priority === 'URGENT').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
