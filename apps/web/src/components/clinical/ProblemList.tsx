'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ProblemList Component
 *
 * Phase 3: Clinical Workflows
 * Hospital-grade problem list management for chronic conditions and active problems
 */

export interface Problem {
  id?: string;
  icd10Code: string;
  description: string;
  status: 'active' | 'resolved' | 'inactive' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate: Date;
  resolvedDate?: Date;
  notes?: string;
  category?: string;
  isPrimary?: boolean;
  isChronicCondition?: boolean;
  lastReviewed?: Date;
  reviewedBy?: string;
}

export interface ProblemListProps {
  patientId?: string;
  problems?: Problem[];
  onAdd?: (problem: Problem) => void;
  onUpdate?: (problemId: string, updates: Partial<Problem>) => void;
  onRemove?: (problemId: string) => void;
  onResolve?: (problemId: string) => void;
  readOnly?: boolean;
  showHistory?: boolean;
  className?: string;
}

const PROBLEM_CATEGORIES = [
  'Cardiovascular',
  'Respiratorio',
  'Endocrino',
  'Neurológico',
  'Gastrointestinal',
  'Musculoesquelético',
  'Dermatológico',
  'Psiquiátrico',
  'Genitourinario',
  'Oncológico',
  'Inmunológico',
  'Oftalmológico',
  'Otorrinolaringológico',
  'Otros',
];

const STATUS_COLORS = {
  active: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300',
  chronic: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300',
};

const SEVERITY_COLORS = {
  mild: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  severe: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export function ProblemList({
  patientId,
  problems = [],
  onAdd,
  onUpdate,
  onRemove,
  onResolve,
  readOnly = false,
  showHistory = true,
  className = '',
}: ProblemListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'chronic' | 'resolved'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'name'>('date');
  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Problem>>({
    status: 'active',
    severity: 'moderate',
    onsetDate: new Date(),
  });

  // Filter and sort problems
  const filteredProblems = problems
    .filter((problem) => {
      if (filterStatus !== 'all' && problem.status !== filterStatus) return false;
      if (filterCategory !== 'all' && problem.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 0, severe: 1, moderate: 2, mild: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case 'name':
          return a.description.localeCompare(b.description);
        case 'date':
        default:
          return new Date(b.onsetDate).getTime() - new Date(a.onsetDate).getTime();
      }
    });

  const activeProblems = problems.filter((p) => p.status === 'active' || p.status === 'chronic');
  const resolvedProblems = problems.filter((p) => p.status === 'resolved');

  const handleAddProblem = () => {
    if (!formData.icd10Code || !formData.description) {
      alert('Por favor complete código ICD-10 y descripción');
      return;
    }

    if (onAdd) {
      onAdd({
        ...formData,
        onsetDate: formData.onsetDate || new Date(),
      } as Problem);
    }

    // Reset form
    setFormData({
      status: 'active',
      severity: 'moderate',
      onsetDate: new Date(),
    });
    setShowAddForm(false);
  };

  const handleResolveProblem = (problemId: string) => {
    if (confirm('¿Confirma que desea marcar este problema como resuelto?')) {
      if (onResolve) {
        onResolve(problemId);
      } else if (onUpdate) {
        onUpdate(problemId, {
          status: 'resolved',
          resolvedDate: new Date(),
        });
      }
    }
  };

  const handleUpdateStatus = (problemId: string, newStatus: Problem['status']) => {
    if (onUpdate) {
      onUpdate(problemId, {
        status: newStatus,
        ...(newStatus === 'resolved' ? { resolvedDate: new Date() } : {}),
      });
    }
  };

  const getDaysActive = (problem: Problem) => {
    const endDate = problem.resolvedDate || new Date();
    const days = Math.floor((endDate.getTime() - new Date(problem.onsetDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lista de Problemas</h2>
            {/* Decorative - low contrast intentional for count summary */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeProblems.length} activos • {resolvedProblems.length} resueltos
            </p>
          </div>
        </div>
        {!readOnly && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            + Agregar Problema
          </button>
        )}
      </div>

      {/* Add Problem Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nuevo Problema</h3>

              {/* ICD-10 Code and Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Código ICD-10 *
                  </label>
                  <input
                    type="text"
                    value={formData.icd10Code || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, icd10Code: e.target.value }))
                    }
                    placeholder="ej: I10, E11.9"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar categoría</option>
                    {PROBLEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción completa del problema"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Status and Severity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as Problem['status'],
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Activo</option>
                    <option value="chronic">Crónico</option>
                    <option value="inactive">Inactivo</option>
                    <option value="resolved">Resuelto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Severidad
                  </label>
                  <select
                    value={formData.severity || 'moderate'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as Problem['severity'],
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="mild">Leve</option>
                    <option value="moderate">Moderada</option>
                    <option value="severe">Severa</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={
                      formData.onsetDate
                        ? new Date(formData.onsetDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        onsetDate: new Date(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrimary || false}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isPrimary: e.target.checked }))
                    }
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Problema Principal
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isChronicCondition || false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isChronicCondition: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Condición Crónica
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas Clínicas
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Notas adicionales sobre el problema..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      status: 'active',
                      severity: 'moderate',
                      onsetDate: new Date(),
                    });
                  }}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddProblem}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Agregar Problema
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Sort */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</span>
            <div className="flex space-x-2">
              {['all', 'active', 'chronic', 'resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as typeof filterStatus)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' && 'Todos'}
                  {status === 'active' && 'Activos'}
                  {status === 'chronic' && 'Crónicos'}
                  {status === 'resolved' && 'Resueltos'}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              <option value="date">Fecha</option>
              <option value="severity">Severidad</option>
              <option value="name">Nombre</option>
            </select>
          </div>
        </div>

        {/* Category Filter */}
        {filterCategory !== 'all' && (
          <div className="mt-3">
            <button
              onClick={() => setFilterCategory('all')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              ✕ Limpiar filtro de categoría: {filterCategory}
            </button>
          </div>
        )}
      </div>

      {/* Problems List */}
      <div className="p-6">
        {filteredProblems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              No hay problemas {filterStatus !== 'all' ? filterStatus : ''}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filterStatus === 'all'
                ? 'Haz clic en "Agregar Problema" para registrar uno'
                : 'Intenta cambiar los filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProblems.map((problem) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-2 rounded-lg transition-all ${
                  expandedProblemId === problem.id
                    ? 'border-primary shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                {/* Problem Header */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedProblemId(
                      expandedProblemId === problem.id ? null : problem.id!
                    )
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono font-bold text-primary">
                        {problem.icd10Code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          STATUS_COLORS[problem.status]
                        }`}
                      >
                        {problem.status === 'active' && 'Activo'}
                        {problem.status === 'chronic' && 'Crónico'}
                        {problem.status === 'resolved' && 'Resuelto'}
                        {problem.status === 'inactive' && 'Inactivo'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          SEVERITY_COLORS[problem.severity]
                        }`}
                      >
                        {problem.severity === 'mild' && 'Leve'}
                        {problem.severity === 'moderate' && 'Moderado'}
                        {problem.severity === 'severe' && 'Severo'}
                        {problem.severity === 'critical' && 'Crítico'}
                      </span>
                      {problem.isPrimary && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded-full">
                          Principal
                        </span>
                      )}
                      {problem.isChronicCondition && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-full">
                          Crónico
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {problem.description}
                    </div>
                    {/* Decorative - low contrast intentional for problem onset date metadata */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-x-3">
                      <span>
                        Inicio: {new Date(problem.onsetDate).toLocaleDateString('es-ES')}
                      </span>
                      <span>•</span>
                      <span>{getDaysActive(problem)} días activo</span>
                      {problem.category && (
                        <>
                          <span>•</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterCategory(problem.category!);
                            }}
                            className="hover:text-primary transition-colors"
                          >
                            {problem.category}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center space-x-2 ml-4">
                      {problem.status !== 'resolved' && onResolve && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveProblem(problem.id!);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Marcar como resuelto"
                        >
                          ✓
                        </button>
                      )}
                      {onRemove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                '¿Está seguro de que desea eliminar este problema de la lista?'
                              )
                            ) {
                              onRemove(problem.id!);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedProblemId === problem.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      {problem.notes && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas Clínicas:
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {problem.notes}
                          </div>
                        </div>
                      )}

                      {problem.resolvedDate && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Resuelto: {new Date(problem.resolvedDate).toLocaleDateString('es-ES')}
                        </div>
                      )}

                      {/* Decorative - low contrast intentional for review timestamp metadata */}
                      {problem.lastReviewed && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Última revisión:{' '}
                          {new Date(problem.lastReviewed).toLocaleDateString('es-ES')}
                          {problem.reviewedBy && ` por ${problem.reviewedBy}`}
                        </div>
                      )}

                      {/* Status Change Buttons */}
                      {!readOnly && onUpdate && problem.status !== 'resolved' && (
                        <div className="flex space-x-2 mt-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Cambiar estado:
                          </span>
                          {['active', 'chronic', 'inactive'].map((status) => (
                            <button
                              key={status}
                              onClick={() =>
                                handleUpdateStatus(problem.id!, status as Problem['status'])
                              }
                              disabled={problem.status === status}
                              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                problem.status === status
                                  ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {status === 'active' && 'Activo'}
                              {status === 'chronic' && 'Crónico'}
                              {status === 'inactive' && 'Inactivo'}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
