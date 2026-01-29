'use client';

/**
 * LONGITUDINAL PREVENTION HUB
 *
 * A comprehensive, AI-powered prevention platform that transforms
 * reactive medicine into proactive, predictive, and participatory care.
 *
 * Features:
 * - Dynamic risk assessment with visual indicators
 * - Longitudinal care timeline across life stages
 * - 7 health domains (Cardiometabolic, Oncology, Musculoskeletal, etc.)
 * - AI-powered intervention recommendations
 * - 100+ integrative & naturopathic approaches
 * - One-click workflow for orders, referrals, and patient engagement
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePreventionDetection, type DetectedConditionFromServer, type RecommendationFromServer } from '@/hooks/useRealtimePreventionUpdates';

// Force dynamic rendering to avoid build errors with useSearchParams
export const dynamic = 'force-dynamic';

// ===========================
// TYPE DEFINITIONS
// ===========================

type HealthDomain =
  | 'cardiometabolic'
  | 'oncology'
  | 'musculoskeletal'
  | 'neurocognitive'
  | 'gut'
  | 'immune'
  | 'hormonal';

type InterventionStatus = 'due' | 'overdue' | 'completed' | 'scheduled' | 'declined';

type InterventionType =
  | 'screening'
  | 'lab'
  | 'lifestyle'
  | 'supplement'
  | 'diet'
  | 'exercise'
  | 'medication'
  | 'referral'
  | 'education';

interface RiskScore {
  id: string;
  name: string;
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'very-high';
  lastCalculated: Date;
  nextDue: Date;
}

interface Intervention {
  id: string;
  name: string;
  domain: HealthDomain;
  type: InterventionType;
  status: InterventionStatus;
  dueDate?: Date;
  completedDate?: Date;
  scheduledDate?: Date;
  description: string;
  evidence: string;
  aiRecommendation?: string;
}

interface PatientProfile {
  id: string;
  age: number;
  gender: string;
  riskScores: RiskScore[];
  activeInterventions: Intervention[];
  completedInterventions: Intervention[];
}

// ===========================
// DOMAIN CONFIGURATION
// ===========================

const HEALTH_DOMAINS = {
  cardiometabolic: {
    id: 'cardiometabolic',
    name: 'Cardiometabolic Health',
    icon: '❤️',
    color: 'red',
    description: 'BP, lipids, glucose, inflammation',
  },
  oncology: {
    id: 'oncology',
    name: 'Oncology Screening',
    icon: '🎗️',
    color: 'purple',
    description: 'Age/risk-appropriate cancer screenings',
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    name: 'Musculoskeletal Health',
    icon: '🦴',
    color: 'blue',
    description: 'Bone density, mobility, strength',
  },
  neurocognitive: {
    id: 'neurocognitive',
    name: 'Neurocognitive & Mental Wellness',
    icon: '🧠',
    color: 'teal',
    description: 'Cognitive assessments, mood, stress',
  },
  gut: {
    id: 'gut',
    name: 'Gut & Digestive Health',
    icon: '🫀',
    color: 'green',
    description: 'Microbiome, digestive symptoms',
  },
  immune: {
    id: 'immune',
    name: 'Immune & Respiratory Function',
    icon: '🛡️',
    color: 'yellow',
    description: 'Vaccinations, immunity, respiratory',
  },
  hormonal: {
    id: 'hormonal',
    name: 'Hormonal & Endocrine Health',
    icon: '⚡',
    color: 'pink',
    description: 'Thyroid, adrenal, sex hormones',
  },
} as const;

// ===========================
// MAIN COMPONENT
// ===========================

export default function PreventionHub() {
  const searchParams = useSearchParams();
  const patientId = searchParams?.get('patient') || 'demo';

  const [activeView, setActiveView] = useState<'timeline' | 'domains' | 'gaps'>('timeline');
  const [selectedDomain, setSelectedDomain] = useState<HealthDomain | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [realtimeNotifications, setRealtimeNotifications] = useState<Array<{
    id: string;
    type: 'condition' | 'recommendation';
    message: string;
    timestamp: Date;
  }>>([]);

  // Real-time prevention detection hook
  const {
    connected: realtimeConnected,
    conditions: realtimeConditions,
    recommendations: realtimeRecommendations,
    isProcessing,
    clearDetections,
  } = usePreventionDetection({
    patientId: patientId !== 'demo' ? patientId : '',
    autoConnect: patientId !== 'demo',
    onConditionDetected: useCallback((conditions: DetectedConditionFromServer[]) => {
      // Add notification for newly detected conditions
      conditions.forEach((condition) => {
        setRealtimeNotifications((prev) => [
          {
            id: `condition-${condition.id}`,
            type: 'condition' as const,
            message: `Detected: ${condition.name} (${Math.round(condition.confidence * 100)}% confidence)`,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5)); // Keep only last 5
      });
    }, []),
    onRecommendationCreated: useCallback((recommendations: RecommendationFromServer[]) => {
      recommendations.forEach((rec) => {
        setRealtimeNotifications((prev) => [
          {
            id: `rec-${rec.id}`,
            type: 'recommendation' as const,
            message: `New recommendation: ${rec.title}`,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5));
      });
    }, []),
  });

  // Load patient data
  useEffect(() => {
    loadPatientData(patientId);
  }, [patientId]);

  const loadPatientData = async (id: string) => {
    setLoading(true);
    try {
      // Fetch real data from Prevention Hub API
      const response = await fetch(`/api/prevention/hub/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.error('Patient not found');
          setPatient(null);
          return;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      const { data } = result;

      // Map API response to PatientProfile format
      const patientProfile: PatientProfile = {
        id: data.patient.id,
        age: data.patient.age,
        gender: data.patient.gender,
        riskScores: data.riskScores.map((risk: {
          id: string;
          name: string;
          score: number;
          level: 'low' | 'moderate' | 'high' | 'very-high';
          lastCalculated: string;
          nextDue: string;
        }) => ({
          id: risk.id,
          name: risk.name,
          score: risk.score,
          level: risk.level,
          lastCalculated: new Date(risk.lastCalculated),
          nextDue: new Date(risk.nextDue),
        })),
        activeInterventions: data.activeInterventions.map((intervention: {
          id: string;
          name: string;
          domain: HealthDomain;
          type: InterventionType;
          status: InterventionStatus;
          dueDate?: string;
          completedDate?: string;
          scheduledDate?: string;
          description: string;
          evidence: string;
          aiRecommendation?: string;
        }) => ({
          id: intervention.id,
          name: intervention.name,
          domain: intervention.domain,
          type: intervention.type,
          status: intervention.status,
          dueDate: intervention.dueDate ? new Date(intervention.dueDate) : undefined,
          completedDate: intervention.completedDate ? new Date(intervention.completedDate) : undefined,
          scheduledDate: intervention.scheduledDate ? new Date(intervention.scheduledDate) : undefined,
          description: intervention.description,
          evidence: intervention.evidence,
          aiRecommendation: intervention.aiRecommendation,
        })),
        completedInterventions: data.completedInterventions.map((intervention: {
          id: string;
          name: string;
          domain: HealthDomain;
          type: InterventionType;
          status: InterventionStatus;
          dueDate?: string;
          completedDate?: string;
          scheduledDate?: string;
          description: string;
          evidence: string;
          aiRecommendation?: string;
        }) => ({
          id: intervention.id,
          name: intervention.name,
          domain: intervention.domain,
          type: intervention.type,
          status: intervention.status,
          dueDate: intervention.dueDate ? new Date(intervention.dueDate) : undefined,
          completedDate: intervention.completedDate ? new Date(intervention.completedDate) : undefined,
          scheduledDate: intervention.scheduledDate ? new Date(intervention.scheduledDate) : undefined,
          description: intervention.description,
          evidence: intervention.evidence,
          aiRecommendation: intervention.aiRecommendation,
        })),
      };

      setPatient(patientProfile);
    } catch (error) {
      console.error('Error loading patient data:', error);
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding intervention to prevention plan
  const handleAddToPlan = async (intervention: Intervention) => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const response = await fetch('/api/prevention/hub/add-to-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          intervention: {
            name: intervention.name,
            domain: intervention.domain,
            type: intervention.type,
            description: intervention.description,
            evidence: intervention.evidence,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add to plan');
      }

      setActionMessage({
        type: 'success',
        text: `Added "${intervention.name}" to prevention plan`,
      });

      // Refresh patient data
      setTimeout(() => {
        loadPatientData(patient.id);
        setSelectedIntervention(null);
        setActionMessage(null);
      }, 1500);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add to plan',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle marking intervention as complete
  const handleMarkComplete = async (intervention: Intervention) => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    // Store previous state for rollback on error
    const previousPatient = patient;

    try {
      // Optimistic update - update local state immediately
      setPatient({
        ...patient,
        activeInterventions: patient.activeInterventions.filter(i => i.id !== intervention.id),
        completedInterventions: [
          ...patient.completedInterventions,
          { ...intervention, status: 'completed' as InterventionStatus, completedDate: new Date() },
        ],
      });

      // Call the API to persist the change
      const response = await fetch('/api/prevention/hub/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId: intervention.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark intervention as complete');
      }

      setActionMessage({
        type: 'success',
        text: `Marked "${intervention.name}" as complete`,
      });

      setTimeout(() => {
        setSelectedIntervention(null);
        setActionMessage(null);
      }, 1500);
    } catch (error) {
      // Rollback optimistic update on error
      setPatient(previousPatient);
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to mark complete',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle exporting prevention report
  const handleExport = async (format: 'csv' | 'pdf' = 'csv') => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      // Build export URL with patient ID and format
      const exportUrl = `/api/prevention/hub/${patient.id}/export?format=${format}`;

      // Fetch the export file
      const response = await fetch(exportUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate export');
      }

      // Get filename from Content-Disposition header or generate default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `prevention_report_${patient.id}_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setActionMessage({
        type: 'success',
        text: `Downloaded prevention report (${format.toUpperCase()})`,
      });

      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to export report',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle creating an order from intervention
  const handleCreateOrder = async (intervention: Intervention) => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      // Map intervention type to order type
      const orderTypeMap: Record<string, 'lab' | 'imaging' | 'procedure'> = {
        lab: 'lab',
        screening: 'imaging',
        referral: 'procedure',
      };
      const orderType = orderTypeMap[intervention.type] || 'procedure';

      const response = await fetch('/api/prevention/hub/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          orderType,
          orderDetails: {
            code: intervention.id,
            display: intervention.name,
          },
          priority: 'routine',
          linkedInterventionId: intervention.id,
          notes: intervention.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      setActionMessage({
        type: 'success',
        text: `Order created for "${intervention.name}"`,
      });

      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create order',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle creating a referral from intervention
  const handleCreateReferral = async (intervention: Intervention) => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      // Map health domain to specialty
      const domainToSpecialty: Record<HealthDomain, string> = {
        cardiometabolic: 'Cardiology',
        oncology: 'Oncology',
        musculoskeletal: 'Orthopedics',
        neurocognitive: 'Neurology',
        gut: 'Gastroenterology',
        immune: 'Immunology',
        hormonal: 'Endocrinology',
      };

      const response = await fetch('/api/prevention/hub/create-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          specialty: domainToSpecialty[intervention.domain] || 'Internal Medicine',
          reason: intervention.name,
          referralType: 'consultation',
          urgency: 'routine',
          linkedInterventionId: intervention.id,
          notes: intervention.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create referral');
      }

      setActionMessage({
        type: 'success',
        text: `Referral created for "${intervention.name}"`,
      });

      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create referral',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle creating a patient task from intervention
  const handleCreatePatientTask = async (intervention: Intervention) => {
    if (!patient) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const response = await fetch('/api/prevention/hub/create-patient-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          title: intervention.name,
          description: intervention.description,
          taskType: 'self_care',
          linkedInterventionId: intervention.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient task');
      }

      setActionMessage({
        type: 'success',
        text: `Task assigned: "${intervention.name}"`,
      });

      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create task',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (level: RiskScore['level']) => {
    switch (level) {
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'very-high': return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  const getStatusColor = (status: InterventionStatus) => {
    switch (status) {
      case 'due': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'overdue': return 'text-red-700 bg-red-50 border-red-200';
      case 'completed': return 'text-green-700 bg-green-50 border-green-200';
      case 'scheduled': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'declined': return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Loading Prevention Hub...
          </h3>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Patient data not found
          </h3>
          <Link
            href="/dashboard/prevention"
            className="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            Back to Prevention
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ===========================
          HEADER - PATIENT AT A GLANCE
          =========================== */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
            <span>›</span>
            <Link href="/dashboard/prevention" className="hover:text-primary">Prevention</Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-white font-medium">Longitudinal Hub</span>
          </div>

          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🧭 Longitudinal Prevention Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Proactive, Predictive, and Participatory Care for Patient #{patient.id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Real-time status indicator */}
              {patientId !== 'demo' && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  realtimeConnected
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  {realtimeConnected ? 'Live' : 'Offline'}
                  {isProcessing && <span className="ml-1 animate-spin">⚙️</span>}
                </div>
              )}
              <button
                onClick={() => handleExport('csv')}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Exporting...' : 'Export Report'}
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Settings
              </button>
            </div>
          </div>

          {/* Risk Scores Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {patient.riskScores.map((risk) => (
              <div
                key={risk.id}
                className={`border-2 rounded-xl p-4 ${getRiskColor(risk.level)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{risk.name}</h3>
                    <p className="text-xs opacity-75">
                      Last calculated: {risk.lastCalculated.toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    risk.level === 'low' ? 'bg-green-200 text-green-800' :
                    risk.level === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                    risk.level === 'high' ? 'bg-orange-200 text-orange-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {risk.level.toUpperCase()}
                  </div>
                </div>

                {/* Risk Score Gauge */}
                <div className="relative">
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        risk.level === 'low' ? 'bg-green-600' :
                        risk.level === 'moderate' ? 'bg-yellow-600' :
                        risk.level === 'high' ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${risk.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs font-bold">{risk.score.toFixed(1)}%</span>
                    <span className="text-xs opacity-75">100%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Real-time Detections Alert */}
          {realtimeNotifications.length > 0 && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl animate-pulse">🔔</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                      Real-Time Prevention Detections
                    </h4>
                    <div className="space-y-1">
                      {realtimeNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2"
                        >
                          <span>{notification.type === 'condition' ? '🔍' : '💡'}</span>
                          <span>{notification.message}</span>
                          <span className="text-xs opacity-60">
                            ({notification.timestamp.toLocaleTimeString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRealtimeNotifications([]);
                    clearDetections();
                  }}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Prevention Gaps Alert */}
          {patient.activeInterventions.filter(i => i.status === 'overdue').length > 0 && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚨</span>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 dark:text-red-200 mb-1">
                    Prevention Gaps Detected
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {patient.activeInterventions.filter(i => i.status === 'overdue').length} overdue screening(s) require immediate attention
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                  Review Now
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===========================
          NAVIGATION TABS
          =========================== */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'timeline'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📈 Longitudinal Timeline
            </button>
            <button
              onClick={() => setActiveView('domains')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'domains'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🎯 Health Domains
            </button>
            <button
              onClick={() => setActiveView('gaps')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'gaps'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ⚠️ Prevention Gaps
            </button>
          </div>
        </div>
      </div>

      {/* ===========================
          MAIN CONTENT AREA
          =========================== */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* TIMELINE VIEW */}
        {activeView === 'timeline' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Longitudinal Care Pathway
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Visualize the patient's entire preventative care journey across time
              </p>
            </div>

            {/* Timeline Component - Horizontal Scrollable */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="relative">
                  {/* Timeline Bar */}
                  <div className="absolute top-12 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700" />

                  {/* Age Markers */}
                  <div className="flex justify-between mb-8">
                    {[40, 45, 50, 55, 60, 65, 70].map((age) => (
                      <div key={age} className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full mb-2 ${
                          age === patient.age
                            ? 'bg-primary ring-4 ring-primary/20'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        <span className={`text-sm font-medium ${
                          age === patient.age
                            ? 'text-primary'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {age}y
                        </span>
                        {age === patient.age && (
                          <span className="text-xs text-primary font-bold mt-1">NOW</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Intervention Cards on Timeline */}
                  <div className="space-y-4">
                    {patient.activeInterventions.map((intervention) => (
                      <div
                        key={intervention.id}
                        className={`border-2 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${getStatusColor(intervention.status)}`}
                        onClick={() => setSelectedIntervention(intervention)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{HEALTH_DOMAINS[intervention.domain].icon}</span>
                              <div>
                                <h4 className="font-bold">{intervention.name}</h4>
                                <p className="text-xs opacity-75">{HEALTH_DOMAINS[intervention.domain].name}</p>
                              </div>
                            </div>
                            <p className="text-sm mb-2">{intervention.description}</p>
                            {intervention.aiRecommendation && (
                              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mt-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-lg">🤖</span>
                                  <div>
                                    <p className="text-xs font-bold mb-1">AI Recommendation</p>
                                    <p className="text-xs">{intervention.aiRecommendation}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                              intervention.status === 'overdue' ? 'bg-red-200 text-red-800' :
                              intervention.status === 'due' ? 'bg-blue-200 text-blue-800' :
                              'bg-gray-200 text-gray-800'
                            }`}>
                              {intervention.status.toUpperCase()}
                            </div>
                            {intervention.dueDate && (
                              <p className="text-xs">
                                Due: {intervention.dueDate.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOMAINS VIEW */}
        {activeView === 'domains' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Health Domains
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Organize care by key health systems and functions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(HEALTH_DOMAINS).map((domain) => {
                const interventions = patient.activeInterventions.filter(
                  (i) => i.domain === domain.id
                );
                const overdueCount = interventions.filter((i) => i.status === 'overdue').length;
                const dueCount = interventions.filter((i) => i.status === 'due').length;

                return (
                  <div
                    key={domain.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
                    onClick={() => setSelectedDomain(domain.id as HealthDomain)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-4xl">{domain.icon}</span>
                      {(overdueCount > 0 || dueCount > 0) && (
                        <div className="flex gap-1">
                          {overdueCount > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                              {overdueCount}
                            </span>
                          )}
                          {dueCount > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                              {dueCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                      {domain.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {domain.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{interventions.length} active interventions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PREVENTION GAPS VIEW */}
        {activeView === 'gaps' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Prevention Gaps & Alerts
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Overdue screenings and interventions requiring immediate action
              </p>
            </div>

            <div className="space-y-4">
              {patient.activeInterventions
                .filter((i) => i.status === 'overdue')
                .map((intervention) => (
                  <div
                    key={intervention.id}
                    className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">{HEALTH_DOMAINS[intervention.domain].icon}</span>
                          <div>
                            <h4 className="font-bold text-lg text-red-900 dark:text-red-200">
                              {intervention.name}
                            </h4>
                            <p className="text-sm text-red-800 dark:text-red-300">
                              {HEALTH_DOMAINS[intervention.domain].name}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {intervention.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-700 dark:text-red-300 font-medium">
                            ⏰ Overdue since: {intervention.dueDate?.toLocaleDateString()}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            📊 {intervention.evidence}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                          Schedule Now
                        </button>
                        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {patient.activeInterventions.filter((i) => i.status === 'overdue').length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Prevention Gaps
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    All screening and interventions are up to date!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===========================
          INTERVENTION WORKBENCH (MODAL)
          =========================== */}
      {selectedIntervention && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{HEALTH_DOMAINS[selectedIntervention.domain].icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedIntervention.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {HEALTH_DOMAINS[selectedIntervention.domain].name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIntervention(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Description</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedIntervention.description}</p>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Evidence Base</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedIntervention.evidence}</p>
              </div>

              {selectedIntervention.aiRecommendation && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">🤖</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                        AI-Powered Recommendation
                      </h4>
                      <p className="text-blue-800 dark:text-blue-300">
                        {selectedIntervention.aiRecommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Tabs */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => selectedIntervention && handleCreateOrder(selectedIntervention)}
                    disabled={actionLoading}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Orders</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Pre-populated lab orders
                    </div>
                  </button>
                  <button
                    onClick={() => selectedIntervention && handleCreateReferral(selectedIntervention)}
                    disabled={actionLoading}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-2">👨‍⚕️</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Referrals</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      One-click specialist referral
                    </div>
                  </button>
                  <button
                    onClick={() => selectedIntervention && handleCreatePatientTask(selectedIntervention)}
                    disabled={actionLoading}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-2">📱</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Patient Tasks</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Assign to patient portal
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Message */}
            {actionMessage && (
              <div className={`mx-6 mb-4 p-4 rounded-lg ${
                actionMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                  : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{actionMessage.type === 'success' ? '✅' : '❌'}</span>
                  <span className="font-medium">{actionMessage.text}</span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between">
              <button
                onClick={() => handleAddToPlan(selectedIntervention)}
                disabled={actionLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    Add to Plan
                  </>
                )}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedIntervention(null)}
                  disabled={actionLoading}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMarkComplete(selectedIntervention)}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark as Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
