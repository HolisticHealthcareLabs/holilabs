'use client';

/**
 * Prevention Hub Client Component
 *
 * Interactive prevention dashboard for patients
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

interface RiskScore {
  id: string;
  name: string;
  score: number;
  level: 'low' | 'moderate' | 'high' | 'very-high';
  description: string;
  explanation: string;
  lastCalculated: string;
}

interface Intervention {
  id: string;
  name: string;
  type: string;
  dueDate: string;
  status: 'overdue' | 'due-soon' | 'scheduled' | 'completed';
  description: string;
  importance: string;
}

interface Goal {
  id: string;
  title: string;
  target: string;
  current: string;
  progress: number;
  category: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface PreventionClientProps {
  initialData: {
    riskScores: RiskScore[];
    interventions: Intervention[];
    goals: Goal[];
    recommendations: Recommendation[];
  };
  patientName: string;
  patientAge: number;
}

export default function PreventionClient({
  initialData,
  patientName,
  patientAge,
}: PreventionClientProps) {
  const t = useTranslations('portal.preventionHub');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'interventions' | 'goals' | 'recommendations'>('overview');
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return {
          bg: 'from-green-500 to-emerald-600',
          text: 'text-green-700',
          border: 'border-green-200',
          badgeBg: 'bg-green-100',
        };
      case 'moderate':
        return {
          bg: 'from-yellow-500 to-orange-500',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          badgeBg: 'bg-yellow-100',
        };
      case 'high':
        return {
          bg: 'from-orange-500 to-red-500',
          text: 'text-orange-700',
          border: 'border-orange-200',
          badgeBg: 'bg-orange-100',
        };
      case 'very-high':
        return {
          bg: 'from-red-500 to-red-700',
          text: 'text-red-700',
          border: 'border-red-200',
          badgeBg: 'bg-red-100',
        };
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          text: 'text-gray-700',
          border: 'border-gray-200',
          badgeBg: 'bg-gray-100',
        };
    }
  };

  const getInterventionStatus = (status: string) => {
    switch (status) {
      case 'overdue':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: '⚠️',
          label: t('statusOverdue'),
        };
      case 'due-soon':
        return {
          color: 'bg-orange-100 text-orange-700 border-orange-200',
          icon: '⏰',
          label: t('statusDueSoon'),
        };
      case 'scheduled':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: '📅',
          label: t('statusScheduledLabel'),
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: '✓',
          label: t('statusCompletedLabel'),
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: '●',
          label: t('statusPendingLabel'),
        };
    }
  };

  if (initialData.riskScores.length === 0 && initialData.interventions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛡️</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {t('emptyTitle')}
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: t('overviewTab'), icon: '📊' },
            { id: 'interventions', label: t('interventionsTab'), icon: '🎯', badge: initialData.interventions.filter(i => i.status === 'overdue' || i.status === 'due-soon').length },
            { id: 'goals', label: t('goalsTab'), icon: '🏋️' },
            { id: 'recommendations', label: t('recommendationsTab'), icon: '💡' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Risk Scores */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📈</span>
              <span>{t('riskScoresTitle')}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialData.riskScores.map((risk) => {
                const colors = getRiskColor(risk.level);
                return (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className={`h-2 bg-gradient-to-r ${colors.bg}`} />
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">
                        {risk.name}
                      </h3>
                      <div className="flex items-end gap-2 mb-3">
                        <span className="text-4xl font-bold text-gray-900">
                          {risk.score}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors.badgeBg} ${colors.text} ${colors.border} mb-1`}>
                          {risk.level.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {risk.description}
                      </p>
                      <button
                        onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {expandedRisk === risk.id ? t('viewLess') : t('viewMore')}
                      </button>
                      <AnimatePresence>
                        {expandedRisk === risk.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                          >
                            <p className="text-sm text-gray-700">
                              {risk.explanation}
                            </p>
                            {/* Decorative - low contrast intentional for last updated metadata */}
                            <p className="text-xs text-gray-500 mt-2">
                              {t('lastUpdated')} {new Date(risk.lastCalculated).toLocaleDateString('es-MX')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold mb-1">
                {initialData.interventions.filter(i => i.status === 'overdue' || i.status === 'due-soon').length}
              </div>
              <div className="text-blue-100">{t('pendingInterventions')}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
              <div className="text-4xl mb-2">🎖️</div>
              <div className="text-3xl font-bold mb-1">
                {initialData.goals.length}
              </div>
              <div className="text-purple-100">{t('activeGoals')}</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg p-6">
              <div className="text-4xl mb-2">💡</div>
              <div className="text-3xl font-bold mb-1">
                {initialData.recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-emerald-100">{t('priorityRecommendations')}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Interventions Tab */}
      {selectedTab === 'interventions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎯</span>
            <span>{t('interventionsTitle')}</span>
          </h2>

          {initialData.interventions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-600">{t('allCurrent')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {initialData.interventions.map((intervention) => {
                const statusInfo = getInterventionStatus(intervention.status);
                return (
                  <div
                    key={intervention.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-4xl">{statusInfo.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">
                            {intervention.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {intervention.description}
                          </p>
                          {/* Decorative - low contrast intentional for intervention metadata (scheduled date, bullet separator, type) */}
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500">
                              {t('scheduledDate')} {new Date(intervention.dueDate).toLocaleDateString('es-MX')}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{t('typeLabel')} {intervention.type}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {intervention.importance && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-yellow-900">
                          <span className="font-semibold">{t('importantLabel')}</span>
                          {intervention.importance}
                        </p>
                      </div>
                    )}

                    {(intervention.status === 'overdue' || intervention.status === 'due-soon') && (
                      <button className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-medium">
                        {t('bookAppointment')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Goals Tab */}
      {selectedTab === 'goals' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎖️</span>
            <span>{t('goalsTitle')}</span>
          </h2>

          {initialData.goals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-gray-600">{t('noGoals')}</p>
              {/* Decorative - low contrast intentional for empty state helper text */}
              <p className="text-sm text-gray-500 mt-2">{t('noGoalsDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialData.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{goal.title}</h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{t('goalTargetLabel')}</span> {goal.target}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{t('goalCurrentLabel')}</span> {goal.current}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600">
                      {goal.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {goal.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations Tab */}
      {selectedTab === 'recommendations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💡</span>
            <span>{t('recsTitle')}</span>
          </h2>

          {initialData.recommendations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">💡</div>
              <p className="text-gray-600">{t('noRecs')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {initialData.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`bg-white rounded-xl shadow-sm border p-6 ${
                    rec.priority === 'high'
                      ? 'border-red-200 bg-red-50/30'
                      : rec.priority === 'medium'
                      ? 'border-orange-200 bg-orange-50/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">
                      {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{rec.title}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-gray-700">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
