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

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PreventionHubSkeleton } from '@/components/skeletons';

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
  const patientId = searchParams.get('patient') || 'demo';

  const [activeView, setActiveView] = useState<'timeline' | 'domains' | 'gaps'>('timeline');
  const [selectedDomain, setSelectedDomain] = useState<HealthDomain | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load patient data
  useEffect(() => {
    loadPatientData(patientId);
  }, [patientId]);

  const loadPatientData = async (id: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const mockData: PatientProfile = {
        id,
        age: 45,
        gender: 'female',
        riskScores: [
          {
            id: 'ascvd',
            name: '10-Year ASCVD Risk',
            score: 12.5,
            level: 'moderate',
            lastCalculated: new Date(),
            nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'diabetes',
            name: 'Lifetime Diabetes Risk',
            score: 35.2,
            level: 'high',
            lastCalculated: new Date(),
            nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'frax',
            name: 'FRAX Score (10-year fracture)',
            score: 8.3,
            level: 'low',
            lastCalculated: new Date(),
            nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        ],
        activeInterventions: [
          {
            id: 'mammo-1',
            name: 'Annual Mammography',
            domain: 'oncology',
            type: 'screening',
            status: 'overdue',
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            description: 'Screening for breast cancer',
            evidence: 'USPSTF Grade B recommendation for women 40-74',
            aiRecommendation: 'Patient is 45 with family history. Consider supplemental ultrasound due to dense breast tissue.',
          },
          {
            id: 'lipid-1',
            name: 'Advanced Lipid Panel',
            domain: 'cardiometabolic',
            type: 'lab',
            status: 'due',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            description: 'ApoB, Lp(a), LDL-P for cardiovascular risk',
            evidence: 'Enhanced risk stratification beyond standard lipid panel',
            aiRecommendation: 'Patient has elevated ASCVD risk. Consider adding ApoB and Lp(a) for precision assessment.',
          },
        ],
        completedInterventions: [],
      };

      setPatient(mockData);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PreventionHubSkeleton />
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
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium">
                Export Report
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
                  <button className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Orders</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Pre-populated lab orders
                    </div>
                  </button>
                  <button className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left">
                    <div className="text-2xl mb-2">👨‍⚕️</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Referrals</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      One-click specialist referral
                    </div>
                  </button>
                  <button className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left">
                    <div className="text-2xl mb-2">📱</div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">Patient Tasks</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Assign to patient portal
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedIntervention(null)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium">
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
