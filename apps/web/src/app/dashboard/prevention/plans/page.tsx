'use client';

/**
 * Prevention Plans History Page
 *
 * Shows all applied prevention protocols for patients
 * Allows tracking status, viewing details, and managing goals
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Activity,
  TrendingUp,
  AlertCircle,
  FileText,
  Filter,
  X,
} from 'lucide-react';
import StatusHistoryTimeline from '@/components/prevention/StatusHistoryTimeline';

interface PreventionPlan {
  id: string;
  planName: string;
  planType: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEACTIVATED';
  guidelineSource: string;
  evidenceLevel: string;
  goals: Array<{
    goal: string;
    targetDate: string | null;
    status: string;
    category: string;
    evidence: string;
    frequency?: string;
    notes?: string;
    updatedAt?: string;
    updatedBy?: string;
  }>;
  recommendations: Array<{
    category: string;
    intervention: string;
    evidence: string;
    frequency: string | null;
    priority: string;
  }>;
  activatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PatientInfo {
  id: string;
  name: string;
  age?: string;
  condition?: string;
}

// Mock patient data for demo
const DEMO_PATIENTS: PatientInfo[] = [
  { id: 'pt-001', name: 'María González', age: '45-54', condition: 'Diabetes Tipo 2' },
  { id: 'pt-002', name: 'Carlos Silva', age: '60-69', condition: 'Post-IAM' },
  { id: 'pt-003', name: 'Ana Rodríguez', age: '30-39', condition: 'Asma' },
  { id: 'pt-004', name: 'Fatima Hassan', age: '25-34', condition: 'Sickle Cell Disease' },
];

export default function PreventionPlansPage() {
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams?.get('patientId') || searchParams?.get('patient');

  const [selectedPatientId, setSelectedPatientId] = useState(patientIdFromUrl || 'pt-001');
  const [plans, setPlans] = useState<PreventionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PreventionPlan | null>(null);
  const [updatingGoal, setUpdatingGoal] = useState<number | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState<'complete' | 'deactivate' | 'reactivate' | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [undoInfo, setUndoInfo] = useState<any>(null);
  const [undoing, setUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  // Advanced filtering
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkParams, setBulkParams] = useState<any>({});
  const [performingBulk, setPerformingBulk] = useState(false);

  const selectedPatient = DEMO_PATIENTS.find((p) => p.id === selectedPatientId);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPlans(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPlans = async (patientId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prevention/plans?patientId=${patientId}`);
      const result = await response.json();

      if (result.success) {
        setPlans(result.data.preventionPlans || []);
      } else {
        setError(result.error || 'Failed to load prevention plans');
      }
    } catch (err) {
      console.error('Error fetching prevention plans:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateGoalStatus = async (
    planId: string,
    goalIndex: number,
    currentStatus: string
  ) => {
    try {
      setUpdatingGoal(goalIndex);

      // Toggle status: PENDING <-> COMPLETED
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

      const response = await fetch(`/api/prevention/plans/${planId}/goals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalIndex,
          updates: {
            status: newStatus,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedPlans = plans.map((p) => {
          if (p.id === planId) {
            const updatedGoals = [...p.goals];
            updatedGoals[goalIndex] = {
              ...updatedGoals[goalIndex],
              status: newStatus,
            };
            return {
              ...p,
              goals: updatedGoals,
              status: result.data.planStatus,
            };
          }
          return p;
        });

        setPlans(updatedPlans);

        // Update selected plan if it's the current one
        if (selectedPlan?.id === planId) {
          const updatedGoals = [...selectedPlan.goals];
          updatedGoals[goalIndex] = {
            ...updatedGoals[goalIndex],
            status: newStatus,
          };
          setSelectedPlan({
            ...selectedPlan,
            goals: updatedGoals,
            status: result.data.planStatus,
          });
        }
      } else {
        console.error('Failed to update goal:', result.error);
      }
    } catch (err) {
      console.error('Error updating goal:', err);
    } finally {
      setUpdatingGoal(null);
    }
  };

  const updateGoalTargetDate = async (
    planId: string,
    goalIndex: number,
    targetDate: string | null
  ) => {
    try {
      const response = await fetch(`/api/prevention/plans/${planId}/goals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalIndex,
          updates: {
            targetDate,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedPlans = plans.map((p) => {
          if (p.id === planId) {
            const updatedGoals = [...p.goals];
            updatedGoals[goalIndex] = {
              ...updatedGoals[goalIndex],
              targetDate,
            };
            return {
              ...p,
              goals: updatedGoals,
            };
          }
          return p;
        });

        setPlans(updatedPlans);

        // Update selected plan if it's the current one
        if (selectedPlan?.id === planId) {
          const updatedGoals = [...selectedPlan.goals];
          updatedGoals[goalIndex] = {
            ...updatedGoals[goalIndex],
            targetDate,
          };
          setSelectedPlan({
            ...selectedPlan,
            goals: updatedGoals,
          });
        }
      } else {
        console.error('Failed to update goal target date:', result.error);
      }
    } catch (err) {
      console.error('Error updating goal target date:', err);
    }
  };

  const updateGoalNotes = async (
    planId: string,
    goalIndex: number,
    notes: string
  ) => {
    try {
      const response = await fetch(`/api/prevention/plans/${planId}/goals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalIndex,
          updates: {
            notes,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedPlans = plans.map((p) => {
          if (p.id === planId) {
            const updatedGoals = [...p.goals];
            updatedGoals[goalIndex] = {
              ...updatedGoals[goalIndex],
              notes,
            };
            return {
              ...p,
              goals: updatedGoals,
            };
          }
          return p;
        });

        setPlans(updatedPlans);

        // Update selected plan if it's the current one
        if (selectedPlan?.id === planId) {
          const updatedGoals = [...selectedPlan.goals];
          updatedGoals[goalIndex] = {
            ...updatedGoals[goalIndex],
            notes,
          };
          setSelectedPlan({
            ...selectedPlan,
            goals: updatedGoals,
          });
        }
      } else {
        console.error('Failed to update goal notes:', result.error);
      }
    } catch (err) {
      console.error('Error updating goal notes:', err);
    }
  };

  const toggleNotes = (goalIndex: number) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalIndex)) {
        newSet.delete(goalIndex);
      } else {
        newSet.add(goalIndex);
      }
      return newSet;
    });
  };

  const handleStatusChange = async () => {
    if (!selectedPlan || !statusAction) return;

    try {
      setUpdatingStatus(true);

      let newStatus: 'ACTIVE' | 'COMPLETED' | 'DEACTIVATED' = 'ACTIVE';
      if (statusAction === 'complete') newStatus = 'COMPLETED';
      if (statusAction === 'deactivate') newStatus = 'DEACTIVATED';
      if (statusAction === 'reactivate') newStatus = 'ACTIVE';

      const response = await fetch(`/api/prevention/plans/${selectedPlan.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || undefined,
          notes: statusNotes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedPlans = plans.map((p) => {
          if (p.id === selectedPlan.id) {
            return {
              ...p,
              status: newStatus,
            };
          }
          return p;
        });

        setPlans(updatedPlans);
        setSelectedPlan({
          ...selectedPlan,
          status: newStatus,
        });

        // Close modals and reset form
        setShowStatusModal(false);
        setStatusAction(null);
        setStatusReason('');
        setStatusNotes('');

        // Refresh plans to get updated data
        await fetchPlans(selectedPatientId);
      } else {
        console.error('Failed to update status:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update plan status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusModal = (action: 'complete' | 'deactivate' | 'reactivate') => {
    setStatusAction(action);
    setStatusReason('');
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const fetchStatusHistory = async (planId: string) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/prevention/plans/${planId}/status/history`);

      if (!response.ok) {
        throw new Error('Failed to fetch status history');
      }

      const result = await response.json();

      if (result.success) {
        setStatusHistory(result.data.statusHistory || []);
      }
    } catch (err) {
      console.error('Error fetching status history:', err);
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleStatusHistory = async (planId: string) => {
    if (!showHistory) {
      // Fetch history if not already shown
      await fetchStatusHistory(planId);
      // Also check if undo is possible
      await checkUndoEligibility(planId);
    }
    setShowHistory(!showHistory);
  };

  const checkUndoEligibility = async (planId: string) => {
    try {
      const response = await fetch(`/api/prevention/plans/${planId}/status/undo`);

      if (!response.ok) {
        setCanUndo(false);
        return;
      }

      const result = await response.json();

      if (result.success && result.canUndo) {
        setCanUndo(true);
        setUndoInfo(result.data);
      } else {
        setCanUndo(false);
        setUndoInfo(null);
      }
    } catch (err) {
      console.error('Error checking undo eligibility:', err);
      setCanUndo(false);
      setUndoInfo(null);
    }
  };

  const handleUndoStatusChange = async () => {
    if (!selectedPlan || !canUndo) return;

    try {
      setUndoing(true);

      const response = await fetch(`/api/prevention/plans/${selectedPlan.id}/status/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const restoredStatus = result.data.restoredStatus;
        const updatedPlans = plans.map((p) => {
          if (p.id === selectedPlan.id) {
            return { ...p, status: restoredStatus };
          }
          return p;
        });

        setPlans(updatedPlans);
        setSelectedPlan({ ...selectedPlan, status: restoredStatus });

        // Close confirm dialog
        setShowUndoConfirm(false);

        // Refresh history and undo eligibility
        await fetchStatusHistory(selectedPlan.id);
        await checkUndoEligibility(selectedPlan.id);

        // Refresh plans
        await fetchPlans(selectedPatientId);
      } else {
        alert(`Error: ${result.error}\n${result.message || ''}`);
      }
    } catch (err) {
      console.error('Error undoing status change:', err);
      alert('Failed to undo status change. Please try again.');
    } finally {
      setUndoing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'DEACTIVATED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Activity className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'DEACTIVATED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPlanTypeColor = (planType: string) => {
    switch (planType) {
      case 'CARDIOVASCULAR':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'DIABETES':
        return 'bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200';
      case 'COMPREHENSIVE':
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication':
        return <Activity className="w-4 h-4" />;
      case 'screening':
        return <Activity className="w-4 h-4" />;
      case 'monitoring':
        return <TrendingUp className="w-4 h-4" />;
      case 'lifestyle':
        return <Activity className="w-4 h-4" />;
      case 'education':
        return <FileText className="w-4 h-4" />;
      case 'referral':
        return <ChevronRight className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateProgress = (goals: PreventionPlan['goals']) => {
    if (!goals || goals.length === 0) return 0;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    return Math.round((completed / goals.length) * 100);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterPlanType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Apply filters to plans
  const filteredPlans = plans.filter((plan) => {
    // Status filter
    if (filterStatus !== 'all' && plan.status !== filterStatus) {
      return false;
    }

    // Plan type filter
    if (filterPlanType !== 'all' && plan.planType !== filterPlanType) {
      return false;
    }

    // Date range filter (createdAt)
    if (filterDateFrom) {
      const planDate = new Date(plan.createdAt);
      const fromDate = new Date(filterDateFrom);
      if (planDate < fromDate) {
        return false;
      }
    }

    if (filterDateTo) {
      const planDate = new Date(plan.createdAt);
      const toDate = new Date(filterDateTo);
      // Set time to end of day for inclusive filtering
      toDate.setHours(23, 59, 59, 999);
      if (planDate > toDate) {
        return false;
      }
    }

    return true;
  });

  // Count active filters
  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterPlanType !== 'all' ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0);

  // Bulk selection handlers
  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlanIds.size === filteredPlans.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(filteredPlans.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedPlanIds(new Set());
  };

  const openBulkAction = (action: string, params?: any) => {
    setBulkAction(action);
    setBulkParams(params || {});
    setShowBulkConfirm(true);
  };

  const handleBulkOperation = async () => {
    if (!bulkAction || selectedPlanIds.size === 0) return;

    try {
      setPerformingBulk(true);

      const response = await fetch('/api/prevention/plans/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: bulkAction,
          planIds: Array.from(selectedPlanIds),
          params: bulkParams,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Close modal
        setShowBulkConfirm(false);
        setBulkAction(null);
        setBulkParams({});

        // Clear selection
        setSelectedPlanIds(new Set());

        // Refresh plans
        await fetchPlans(selectedPatientId);

        // Show success message
        alert(
          `Operación completada: ${result.data.successCount} exitosos, ${result.data.failureCount} fallidos`
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Error performing bulk operation:', err);
      alert('Error al realizar la operación en bloque. Por favor intente nuevamente.');
    } finally {
      setPerformingBulk(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Planes de Prevención
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Historial de protocolos aplicados • Holi Labs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                Seleccionar Paciente
              </h2>
              <div className="space-y-2">
                {DEMO_PATIENTS.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedPatientId === patient.id
                        ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {patient.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {patient.condition}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plans List */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Stats Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Planes de {selectedPatient?.name}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                        activeFilterCount > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                      {activeFilterCount > 0 && (
                        <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => fetchPlans(selectedPatientId)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Filtrar Planes</h3>
                      <button
                        onClick={clearFilters}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center space-x-1"
                      >
                        <X className="w-4 h-4" />
                        <span>Limpiar Filtros</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Estado
                        </label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">Todos los estados</option>
                          <option value="ACTIVE">Activos</option>
                          <option value="COMPLETED">Completados</option>
                          <option value="DEACTIVATED">Desactivados</option>
                        </select>
                      </div>

                      {/* Plan Type Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tipo de Plan
                        </label>
                        <select
                          value={filterPlanType}
                          onChange={(e) => setFilterPlanType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">Todos los tipos</option>
                          <option value="CARDIOVASCULAR">Cardiovascular</option>
                          <option value="DIABETES">Diabetes</option>
                          <option value="COMPREHENSIVE">Comprehensive</option>
                        </select>
                      </div>

                      {/* Date From Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fecha Desde
                        </label>
                        <input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Date To Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fecha Hasta
                        </label>
                        <input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Filter Summary */}
                    {activeFilterCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando <strong>{filteredPlans.length}</strong> de <strong>{plans.length}</strong> planes
                          {activeFilterCount > 0 && ` (${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} aplicado${activeFilterCount > 1 ? 's' : ''})`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Actions Toolbar */}
                {selectedPlanIds.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-blue-900 dark:text-blue-200">
                          {selectedPlanIds.size} {selectedPlanIds.size === 1 ? 'plan seleccionado' : 'planes seleccionados'}
                        </span>
                        <button
                          onClick={clearSelection}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Limpiar selección
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openBulkAction('status_change', { status: 'COMPLETED', reason: 'all_goals_met' })}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Completar</span>
                        </button>
                        <button
                          onClick={() => openBulkAction('status_change', { status: 'DEACTIVATED', reason: 'no_longer_indicated' })}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Desactivar</span>
                        </button>
                        <button
                          onClick={() => openBulkAction('delete')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Archivar</span>
                        </button>
                        <button
                          onClick={() => openBulkAction('duplicate')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Duplicar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && (
                  <>
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        checked={filteredPlans.length > 0 && selectedPlanIds.size === filteredPlans.length}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Seleccionar todos los planes
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-900 dark:text-green-200">
                          {filteredPlans.filter((p) => p.status === 'ACTIVE').length}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-400">
                          Planes Activos
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                          {filteredPlans.filter((p) => p.status === 'COMPLETED').length}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-400">
                          Completados
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                          {filteredPlans.reduce((sum, p) => sum + (p.goals?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-400">
                          Intervenciones Totales
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando planes...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-6">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && plans.length === 0 && (
                <div className="p-12 text-center">
                  <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No hay planes de prevención
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Este paciente no tiene protocolos de prevención aplicados todavía.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Ve al AI Copilot y aplica un protocolo para comenzar.
                  </p>
                </div>
              )}

              {/* No Results After Filtering */}
              {!loading && !error && plans.length > 0 && filteredPlans.length === 0 && (
                <div className="p-12 text-center">
                  <Filter className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No se encontraron planes
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    No hay planes que coincidan con los filtros seleccionados.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              )}

              {/* Plans List */}
              {!loading && !error && filteredPlans.length > 0 && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedPlanIds.has(plan.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            togglePlanSelection(plan.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                        />

                        {/* Plan Content */}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {plan.planName}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 ${getStatusColor(
                                plan.status
                              )}`}
                            >
                              {getStatusIcon(plan.status)}
                              <span>{plan.status}</span>
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {plan.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                            <span className={`px-2 py-1 rounded border ${getPlanTypeColor(plan.planType)}`}>
                              {plan.planType}
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(plan.createdAt)}</span>
                            </span>
                            <span>
                              {plan.guidelineSource} • {plan.evidenceLevel}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>

                      {/* Progress Bar */}
                      {plan.goals && plan.goals.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <span>
                              Progreso: {plan.goals.filter((g) => g.status === 'COMPLETED').length} de{' '}
                              {plan.goals.length} intervenciones
                            </span>
                            <span className="font-semibold">{calculateProgress(plan.goals)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${calculateProgress(plan.goals)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quick Goals Preview */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {plan.goals?.slice(0, 4).map((goal, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 flex items-start space-x-2"
                          >
                            <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                              {getCategoryIcon(goal.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white font-medium truncate">
                                {goal.goal}
                              </p>
                              <p className="text-gray-500 dark:text-gray-500 capitalize">
                                {goal.category}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedPlan.planName}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold flex items-center space-x-1 ${getStatusColor(
                        selectedPlan.status
                      )}`}
                    >
                      {getStatusIcon(selectedPlan.status)}
                      <span>{selectedPlan.status}</span>
                    </span>
                    <span className={`px-3 py-1 rounded text-sm border ${getPlanTypeColor(selectedPlan.planType)}`}>
                      {selectedPlan.planType}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Descripción</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedPlan.description}</p>
              </div>

              {/* Guideline Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      Fuente de Guía Clínica
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedPlan.guidelineSource}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {selectedPlan.evidenceLevel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Goals/Interventions */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                  Intervenciones ({selectedPlan.goals?.length || 0})
                </h3>
                <div className="space-y-3">
                  {selectedPlan.goals?.map((goal, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 transition-all ${
                        goal.status === 'COMPLETED'
                          ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Checkbox for completion */}
                        <button
                          onClick={() => updateGoalStatus(selectedPlan.id, idx, goal.status)}
                          disabled={updatingGoal === idx}
                          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            goal.status === 'COMPLETED'
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                          } ${
                            updatingGoal === idx ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          {updatingGoal === idx ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            goal.status === 'COMPLETED' && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )
                          )}
                        </button>

                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {getCategoryIcon(goal.category)}
                        </div>

                        <div className="flex-1">
                          <h4
                            className={`font-semibold mb-1 ${
                              goal.status === 'COMPLETED'
                                ? 'text-gray-500 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {goal.goal}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
                              {goal.category}
                            </span>
                            {goal.status === 'COMPLETED' && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completado</span>
                              </span>
                            )}
                            {goal.frequency && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{goal.frequency}</span>
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm mb-3 ${
                              goal.status === 'COMPLETED'
                                ? 'text-gray-500 dark:text-gray-500'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {goal.evidence}
                          </p>
                          {/* Target Date Picker */}
                          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              Fecha objetivo:
                            </label>
                            <input
                              type="date"
                              value={goal.targetDate ? goal.targetDate.split('T')[0] : ''}
                              onChange={(e) =>
                                updateGoalTargetDate(
                                  selectedPlan.id,
                                  idx,
                                  e.target.value ? new Date(e.target.value).toISOString() : null
                                )
                              }
                              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            {goal.targetDate && (
                              <button
                                onClick={() => updateGoalTargetDate(selectedPlan.id, idx, null)}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                Limpiar
                              </button>
                            )}
                          </div>

                          {/* Clinical Notes Section */}
                          <div className="mt-3">
                            <button
                              onClick={() => toggleNotes(idx)}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center space-x-1 transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>
                                {expandedNotes.has(idx) ? 'Ocultar notas' : 'Agregar/ver notas clínicas'}
                              </span>
                              {(goal as any).notes && !expandedNotes.has(idx) && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                  📝
                                </span>
                              )}
                            </button>
                            {expandedNotes.has(idx) && (
                              <div className="mt-2">
                                <textarea
                                  value={(goal as any).notes || ''}
                                  onChange={(e) => updateGoalNotes(selectedPlan.id, idx, e.target.value)}
                                  placeholder="Agregar notas clínicas, barreras, adherencia, etc..."
                                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                  rows={3}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Las notas se guardan automáticamente
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Información del Plan</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Creado:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedPlan.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Actualizado:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedPlan.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">ID del Plan:</span>
                    <p className="font-mono text-xs text-gray-900 dark:text-white">
                      {selectedPlan.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status History Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Historial de Estado</h3>
                  <button
                    onClick={() => toggleStatusHistory(selectedPlan.id)}
                    disabled={loadingHistory}
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingHistory ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando...</span>
                      </div>
                    ) : showHistory ? (
                      'Ocultar'
                    ) : (
                      'Ver Historial'
                    )}
                  </button>
                </div>

                {showHistory && (
                  <div className="space-y-4">
                    {/* Undo Banner */}
                    {canUndo && undoInfo && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                                Deshacer Cambio de Estado
                              </h4>
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                              Último cambio: <strong>{undoInfo.lastChange.fromStatus}</strong> →{' '}
                              <strong>{undoInfo.lastChange.toStatus}</strong> hace{' '}
                              <strong>{Math.floor(undoInfo.lastChange.hoursSinceChange)} horas</strong>
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Tiempo restante para deshacer:{' '}
                              <strong>{Math.floor(undoInfo.timeRemaining)} horas</strong>
                            </p>
                          </div>
                          <button
                            onClick={() => setShowUndoConfirm(true)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                          >
                            <Activity className="w-4 h-4 transform rotate-180" />
                            <span>Deshacer</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status History Timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      {statusHistory.length > 0 ? (
                        <StatusHistoryTimeline
                          statusHistory={statusHistory}
                          currentStatus={selectedPlan.status}
                          createdAt={selectedPlan.createdAt}
                          completedAt={null}
                          deactivatedAt={null}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No hay cambios de estado registrados</p>
                          <p className="text-sm mt-1">
                            El historial se actualizará cuando se cambien los estados
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Cerrar
                </button>
                <div className="flex items-center space-x-3">
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Exportar PDF
                  </button>
                  {selectedPlan.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => openStatusModal('complete')}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar Completo</span>
                      </button>
                      <button
                        onClick={() => openStatusModal('deactivate')}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Desactivar</span>
                      </button>
                    </>
                  )}
                  {selectedPlan.status === 'DEACTIVATED' && (
                    <button
                      onClick={() => openStatusModal('reactivate')}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Reactivar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && statusAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {statusAction === 'complete' && 'Marcar Plan como Completo'}
                {statusAction === 'deactivate' && 'Desactivar Plan'}
                {statusAction === 'reactivate' && 'Reactivar Plan'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {statusAction === 'complete' && 'El plan se marcará como completado exitosamente.'}
                {statusAction === 'deactivate' && 'El plan se desactivará y ya no aparecerá como activo.'}
                {statusAction === 'reactivate' && 'El plan se reactivará y volverá a estar activo.'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Motivo {statusAction !== 'reactivate' && '(requerido)'}
                </label>
                <select
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required={statusAction !== 'reactivate'}
                >
                  <option value="">Seleccionar motivo...</option>
                  {statusAction === 'complete' && (
                    <>
                      <option value="all_goals_met">Todas las metas cumplidas</option>
                      <option value="patient_declined">Paciente declinó más intervenciones</option>
                      <option value="transitioned_protocol">Transición a otro protocolo</option>
                      <option value="no_longer_indicated">Ya no clínicamente indicado</option>
                      <option value="other">Otro (especificar en notas)</option>
                    </>
                  )}
                  {statusAction === 'deactivate' && (
                    <>
                      <option value="no_longer_indicated">Ya no clínicamente indicado</option>
                      <option value="patient_transferred">Paciente transferido a otro proveedor</option>
                      <option value="duplicate_protocol">Protocolo duplicado</option>
                      <option value="patient_declined">Paciente declinó seguimiento</option>
                      <option value="superseded">Reemplazado por protocolo más reciente</option>
                      <option value="other">Otro (especificar en notas)</option>
                    </>
                  )}
                  {statusAction === 'reactivate' && (
                    <>
                      <option value="continued_need">Necesidad continua de prevención</option>
                      <option value="patient_returned">Paciente regresó a cuidado</option>
                      <option value="deactivated_error">Desactivado por error</option>
                      <option value="other">Otro (especificar en notas)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Agregar contexto adicional, detalles clínicos, o justificación..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Warning for Deactivation */}
              {statusAction === 'deactivate' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Advertencia:</strong> Este plan se ocultará de la vista activa. Podrás reactivarlo más tarde si es necesario.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusAction(null);
                    setStatusReason('');
                    setStatusNotes('');
                  }}
                  disabled={updatingStatus}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={updatingStatus || (statusAction !== 'reactivate' && !statusReason)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                    statusAction === 'complete'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : statusAction === 'deactivate'
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      {statusAction === 'complete' && <CheckCircle2 className="w-4 h-4" />}
                      {statusAction === 'deactivate' && <XCircle className="w-4 h-4" />}
                      {statusAction === 'reactivate' && <Activity className="w-4 h-4" />}
                      <span>
                        {statusAction === 'complete' && 'Confirmar Completado'}
                        {statusAction === 'deactivate' && 'Confirmar Desactivación'}
                        {statusAction === 'reactivate' && 'Confirmar Reactivación'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Confirmation Modal */}
      {showUndoConfirm && undoInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Confirmar Deshacer Cambio
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Esta acción revertirá el último cambio de estado
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Detalles del Cambio
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <p>
                    <strong>De:</strong> {undoInfo.lastChange.fromStatus}
                  </p>
                  <p>
                    <strong>A:</strong> {undoInfo.lastChange.toStatus}
                  </p>
                  <p>
                    <strong>Realizado hace:</strong>{' '}
                    {Math.floor(undoInfo.lastChange.hoursSinceChange)} horas
                  </p>
                  {undoInfo.lastChange.reason && (
                    <p>
                      <strong>Motivo:</strong> {undoInfo.lastChange.reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Nota:</strong> El plan volverá al estado{' '}
                    <strong>{undoInfo.wouldRevertTo}</strong>. Esta acción quedará registrada en el
                    historial.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowUndoConfirm(false)}
                  disabled={undoing}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUndoStatusChange}
                  disabled={undoing}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {undoing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deshaciendo...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 transform rotate-180" />
                      <span>Confirmar Deshacer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Modal */}
      {showBulkConfirm && bulkAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Confirmar Operación en Bloque
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Esta acción se aplicará a {selectedPlanIds.size} plan{selectedPlanIds.size > 1 ? 'es' : ''}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Operación:{' '}
                  {bulkAction === 'status_change' && 'Cambio de Estado'}
                  {bulkAction === 'delete' && 'Archivar Planes'}
                  {bulkAction === 'duplicate' && 'Duplicar Planes'}
                </h4>
                {bulkAction === 'status_change' && bulkParams.status && (
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Nuevo estado: <strong>{bulkParams.status}</strong>
                    {bulkParams.reason && (
                      <>
                        <br />
                        Motivo: <strong>{bulkParams.reason}</strong>
                      </>
                    )}
                  </p>
                )}
                {bulkAction === 'delete' && (
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Los planes seleccionados serán archivados y su estado cambiará a DEACTIVATED.
                  </p>
                )}
                {bulkAction === 'duplicate' && (
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Se crearán copias de los planes seleccionados con el mismo contenido pero en estado
                    ACTIVE.
                  </p>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Nota:</strong> Esta operación afectará a <strong>{selectedPlanIds.size}</strong>{' '}
                    {selectedPlanIds.size === 1 ? 'plan' : 'planes'}. Los cambios quedarán registrados en el
                    historial de cada plan.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBulkConfirm(false);
                    setBulkAction(null);
                    setBulkParams({});
                  }}
                  disabled={performingBulk}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkOperation}
                  disabled={performingBulk}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {performingBulk ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Operación</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
